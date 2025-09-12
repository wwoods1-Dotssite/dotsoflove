// server.js - Pet Sitting Backend Service with S3 v3 Storage and PostgreSQL
const express = require('express');
const sgMail = require('@sendgrid/mail');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 8080;

// Configure AWS S3 v3 Client with validation
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// DEBUG: Log environment variables (remove in production)
console.log('DEBUG - Environment check:');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 4)}...` : 'MISSING');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'MISSING');
console.log('AWS_REGION:', process.env.AWS_REGION || 'us-east-2 (default)');
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME || 'dotsoflove-pet-images (default)');
// Add this after your existing console.log statements
console.log('Server directory contents:', fs.readdirSync(__dirname));
console.log('Looking for index.html at:', path.join(__dirname, 'index.html'));
console.log('Index.html exists in root:', fs.existsSync(path.join(__dirname, 'index.html')));
console.log('Index.html exists in public:', fs.existsSync(path.join(__dirname, 'public', 'index.html')));

const S3_BUCKET = process.env.S3_BUCKET_NAME || 'dotsoflove-pet-images';

// Test S3 connection on startup
async function testS3Connection() {
    try {
        console.log(`Testing connection to bucket: ${S3_BUCKET} in region: ${process.env.AWS_REGION || 'us-east-2'}`);
        await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
        console.log('✅ S3 connection successful');
    } catch (error) {
        console.error('❌ S3 connection failed:');
        console.error('Error name:', error.name);
        console.error('Error code:', error.$metadata?.httpStatusCode);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
    }
}
// JWT middleware for admin authentication
const authenticateAdmin = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

// Middleware
app.use(cors({
    origin: ['https://dotsoflovepetsitting.com', 'https://www.dotsoflovepetsitting.com','https://visionary-queijadas-65e069.netlify.app', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// Configure multer for memory storage (we'll upload directly to S3)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 10 // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
        }
    }
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
        }
    } else if (error.message.includes('Only images are allowed')) {
        return res.status(400).json({ error: error.message });
    }
    next(error);
});

// Helper function to upload file to S3 using SDK v3
async function uploadToS3(file, folder = 'pets') {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${folder}/${uuidv4()}${fileExtension}`;
    
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // No ACL needed since you have bucket policy in place
    });
    
    try {
        const result = await s3Client.send(command);
        const s3Url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${fileName}`;
        console.log('✅ File uploaded to S3:', s3Url);
        return s3Url;
    } catch (error) {
        console.error('❌ S3 upload error:', error);
        
        // More specific error handling
        if (error.name === 'CredentialsError') {
            throw new Error('S3 credentials are invalid or missing');
        } else if (error.name === 'NoSuchBucket') {
            throw new Error(`S3 bucket ${S3_BUCKET} does not exist`);
        } else if (error.name === 'AccessDenied') {
            throw new Error('Access denied - check S3 bucket permissions');
        }
        
        throw new Error(`Failed to upload image to S3: ${error.message}`);
    }
}

// Helper function to delete file from S3 using SDK v3
async function deleteFromS3(imageUrl) {
    try {
        // Extract the key from the full S3 URL
        const urlParts = imageUrl.split('/');
        const key = urlParts.slice(-2).join('/'); // Get 'pets/filename.jpg'
        
        const command = new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: key
        });
        
        await s3Client.send(command);
        console.log('File deleted from S3:', key);
    } catch (error) {
        console.error('S3 delete error:', error);
        // Don't throw error - we don't want to fail the main operation if S3 delete fails
    }
}

// Email configuration
const EMAIL_RECIPIENTS = [
    'dotty.j.woods@gmail.com',
    'wwoods1@gmail.com',
    'dotsoflovepetsitting@gmail.com'
];

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database connection debugging
console.log('Database configuration:');
console.log('   Type: PostgreSQL');
console.log('   Environment:', process.env.NODE_ENV);
console.log('   SSL:', process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled');
console.log('   S3 Bucket:', S3_BUCKET);
console.log('   AWS Region:', process.env.AWS_REGION || 'us-east-2');

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err);
    } else {
        console.log('Successfully connected to PostgreSQL database');
        release();
    }
});

// Initialize database tables
async function initializeTables() {
    try {
        // Existing contacts table with structured date support
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                best_time TEXT,
                service TEXT,
                pet_info TEXT,
                dates TEXT,
                message TEXT,
                start_date DATE,
                end_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Gallery pets table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS gallery_pets (
                id SERIAL PRIMARY KEY,
                pet_name TEXT NOT NULL,
                story_description TEXT,
                service_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_dorothy_pet BOOLEAN DEFAULT FALSE
            )
        `);

        // Pet images table - updated for S3 URLs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pet_images (
                id SERIAL PRIMARY KEY,
                pet_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                s3_key TEXT,
                is_primary BOOLEAN DEFAULT FALSE,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pet_id) REFERENCES gallery_pets (id) ON DELETE CASCADE
            )
        `);

        // Service rates table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS service_rates (
                id SERIAL PRIMARY KEY,
                service_type TEXT NOT NULL UNIQUE,
                rate_per_unit DECIMAL(10,2) NOT NULL,
                unit_type TEXT NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Admin users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add S3 key column to existing pet_images table if it doesn't exist
        try {
            await pool.query(`
                ALTER TABLE pet_images 
                ADD COLUMN IF NOT EXISTS s3_key TEXT
            `);
            console.log('Added s3_key column to pet_images table');
        } catch (error) {
            console.log('Note: s3_key column may already exist:', error.message);
        }

        // Insert default rates if none exist
        const ratesResult = await pool.query('SELECT COUNT(*) as count FROM service_rates');
        if (parseInt(ratesResult.rows[0].count) === 0) {
            console.log('Initializing default rates...');
            const defaultRates = [
                ['Pet Sitting (Overnight)', 75.00, 'per_night', 'Overnight care in your home with 24/7 attention', true],
                ['Dog Walking', 25.00, 'per_walk', '30-45 minute walks to keep your dog happy and healthy', false],
                ['Pet Visits', 30.00, 'per_visit', 'Check-ins, feeding, and care visits throughout the day', false],
                ['Holiday/Weekend Rate', 85.00, 'per_night', 'Special holiday and weekend care rates', false]
            ];
            
            for (const rate of defaultRates) {
                await pool.query(
                    'INSERT INTO service_rates (service_type, rate_per_unit, unit_type, description, is_featured) VALUES ($1, $2, $3, $4, $5)',
                    rate
                );
            }
            console.log('Default rates initialized successfully');
        }

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
}

// Initialize tables on startup
initializeTables();
testS3Connection(); 

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        const dbTest = await pool.query('SELECT 1 as health_check');
        
        res.status(200).json({ 
            status: 'OK', 
            message: 'Pet Sitting Backend is healthy!',
            timestamp: new Date().toISOString(),
            database: 'connected',
            s3: 'configured',
            port: PORT,
            env: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'ERROR',
            message: 'Service unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Add a simple root route that explicitly serves your index.html:
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Attempting to serve:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
    
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('SendFile error:', err);
            res.status(404).send(`
                <h1>File Not Found</h1>
                <p>Looking for: ${indexPath}</p>
                <p>Directory contents: ${fs.readdirSync(__dirname).join(', ')}</p>
            `);
        }
    });
});

// Helper function to parse date strings
function parseDateString(dateString) {
    if (!dateString) return { startDate: null, endDate: null };
    
    // Handle formats like "December 25, 2024" or "December 25, 2024 to December 31, 2024"
    const dateRegex = /(\w+ \d{1,2}, \d{4})/g;
    const matches = dateString.match(dateRegex);
    
    if (!matches || matches.length === 0) {
        return { startDate: null, endDate: null };
    }
    
    const startDate = new Date(matches[0]);
    const endDate = matches.length > 1 ? new Date(matches[1]) : null;
    
    return {
        startDate: isNaN(startDate.getTime()) ? null : startDate.toISOString().split('T')[0],
        endDate: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString().split('T')[0] : null
    };
}

// Contact form endpoint with enhanced date handling
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, bestTime, service, petInfo, dates, message } = req.body;
    
    console.log('Received contact form submission:', { name, email, phone, dates });
    
    if (!name || (!email && !phone)) {
        return res.status(400).json({ 
            error: 'Name and either email or phone number are required' 
        });
    }
    
    try {
        // Parse dates if provided in the new format
        let startDate = null;
        let endDate = null;
        
        if (dates) {
            const parsedDates = parseDateString(dates);
            startDate = parsedDates.startDate;
            endDate = parsedDates.endDate;
        }
        
        const result = await pool.query(`
            INSERT INTO contacts (name, email, phone, best_time, service, pet_info, dates, message, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `, [name, email, phone, bestTime, service, petInfo, dates, message, startDate, endDate]);
        
        const contactId = result.rows[0].id;
        console.log('Contact saved to database with ID:', contactId);
        
        sendEmailNotification({
            id: contactId,
            name, email, phone, bestTime, service, petInfo, dates, message,
            startDate, endDate
        });
        
        res.json({ success: true, message: 'Contact request submitted successfully' });
        
    } catch (error) {
        console.error('Error processing contact:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GALLERY ENDPOINTS WITH S3 v3 INTEGRATION

// Get all gallery pets with their images (public endpoint)
app.get('/api/gallery', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', i.id,
                            'url', i.image_url,
                            'isPrimary', i.is_primary,
                            'displayOrder', i.display_order
                        ) ORDER BY i.display_order, i.created_at
                    ) FILTER (WHERE i.id IS NOT NULL),
                    '[]'::json
                ) as images
            FROM gallery_pets p
            LEFT JOIN pet_images i ON p.id = i.pet_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to retrieve gallery' });
    }
});

// Get single pet with images
app.get('/api/gallery/:id', async (req, res) => {
    const petId = req.params.id;
    
    try {
        const query = `
            SELECT 
                p.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', i.id,
                            'url', i.image_url,
                            'isPrimary', i.is_primary,
                            'displayOrder', i.display_order
                        ) ORDER BY i.display_order, i.created_at
                    ) FILTER (WHERE i.id IS NOT NULL),
                    '[]'::json
                ) as images
            FROM gallery_pets p
            LEFT JOIN pet_images i ON p.id = i.pet_id
            WHERE p.id = $1
            GROUP BY p.id
        `;
        
        const result = await pool.query(query, [petId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to retrieve pet' });
    }
});

// Admin: Add new pet to gallery with S3 v3 image upload// Admin: Add new pet to gallery with S3 v3 image upload
app.post('/api/admin/gallery', authenticateAdmin, upload.array('images', 10), async (req, res) => {
    const { petName, storyDescription, serviceDate, isDorothyPet } = req.body;
    
    console.log('Creating pet with checkbox value:', isDorothyPet, typeof isDorothyPet);
    console.log('Files received:', req.files?.length || 0);
    
    if (!petName) {
        return res.status(400).json({ error: 'Pet name is required' });
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Fix: Handle checkbox values properly
        const isDorothyPetBool = isDorothyPet === 'true' || isDorothyPet === true || isDorothyPet === 'on';
        console.log('Converted checkbox value:', isDorothyPetBool);
        
        // Insert pet record
        const petResult = await client.query(`
            INSERT INTO gallery_pets (pet_name, story_description, service_date, is_dorothy_pet)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [petName, storyDescription || '', serviceDate || '', isDorothyPetBool]);
        
        const petId = petResult.rows[0].id;
        console.log('Created pet with ID:', petId, 'isDorothyPet:', isDorothyPetBool);
        
        // Upload images to S3 and insert records
        if (req.files && req.files.length > 0) {
            console.log(`Processing ${req.files.length} images for upload...`);
            
            for (let index = 0; index < req.files.length; index++) {
                const file = req.files[index];
                const isPrimary = index === 0; // First image is primary
                
                try {
                    // Upload to S3
                    const s3Url = await uploadToS3(file, 'pets');
                    
                    // Extract S3 key for future deletion
                    const urlParts = s3Url.split('/');
                    const s3Key = urlParts.slice(-2).join('/');
                    
                    // Insert image record
                    await client.query(`
                        INSERT INTO pet_images (pet_id, image_url, s3_key, is_primary, display_order)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [petId, s3Url, s3Key, isPrimary, index]);
                    
                    console.log(`Image ${index + 1} uploaded successfully: ${s3Url}`);
                } catch (uploadError) {
                    console.error(`Failed to upload image ${index + 1}:`, uploadError);
                    // Continue with other images even if one fails
                }
            }
        } else {
            console.log('No images provided - creating pet without photos');
        }
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Pet added to gallery successfully!',
            petId: petId,
            isDorothyPet: isDorothyPetBool
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to add pet to gallery' });
    } finally {
        client.release();
    }
});

// Admin: Update existing pet story and details
app.put('/api/admin/gallery/:id', authenticateAdmin, async (req, res) => {
    const petId = req.params.id;
    const { petName, storyDescription, serviceDate, isDorothyPet } = req.body;
    
    console.log('📝 Updating pet with data:', {
        petId,
        petName,
        storyDescription,
        serviceDate,
        isDorothyPet,
        isDorothyPetType: typeof isDorothyPet
    });
    
    if (!petName) {
        return res.status(400).json({ error: 'Pet name is required' });
    }
    
    try {
        // Convert isDorothyPet to boolean properly
        const isDorothyPetBool = isDorothyPet === 'true' || isDorothyPet === true;
        console.log('🔄 Converting isDorothyPet for update:', { original: isDorothyPet, converted: isDorothyPetBool });
        
        const result = await pool.query(`
            UPDATE gallery_pets 
            SET pet_name = $1, story_description = $2, service_date = $3, is_dorothy_pet = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [petName, storyDescription || '', serviceDate || '', isDorothyPetBool, petId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        
        console.log('✅ Pet updated successfully:', { petId, isDorothyPet: isDorothyPetBool });
        
        res.json({ 
            success: true, 
            message: 'Pet updated successfully',
            isDorothyPet: isDorothyPetBool
        });
    } catch (error) {
        console.error('❌ Database error:', error);
        res.status(500).json({ error: 'Failed to update pet' });
    }
});

// Admin: Delete pet from gallery (and all associated S3 v3 images)
app.delete('/api/admin/gallery/:id', authenticateAdmin, async (req, res) => {
    const petId = req.params.id;
    
    try {
        // First get all image URLs to delete from S3
        const imagesResult = await pool.query('SELECT image_url, s3_key FROM pet_images WHERE pet_id = $1', [petId]);
        
        // Delete all image files from S3
        const deletePromises = imagesResult.rows.map(image => {
            if (image.s3_key) {
                return deleteFromS3(image.image_url);
            }
        });
        
        await Promise.all(deletePromises);
        console.log(`Deleted ${imagesResult.rows.length} images from S3`);
        
        // Delete pet and associated images (CASCADE will handle pet_images)
        const result = await pool.query('DELETE FROM gallery_pets WHERE id = $1', [petId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        
        res.json({ success: true, message: 'Pet and all S3 images deleted successfully' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to delete pet' });
    }
});

// Add this new endpoint to your server.js file
// Place it after your existing gallery endpoints but before the rates endpoints

// Admin: Update existing pet story and add new photos
app.put('/api/admin/gallery/:id/update-with-photos', authenticateAdmin, upload.array('images', 10), async (req, res) => {
    const petId = req.params.id;
    const { petName, storyDescription, serviceDate, isDorothyPet } = req.body;
    const newImages = req.files || [];
    
    console.log('📝 Updating pet with story and photos:', {
        petId,
        petName,
        storyDescription,
        serviceDate,
        isDorothyPet,
        newImagesCount: newImages.length
    });
    
    if (!petName) {
        return res.status(400).json({ error: 'Pet name is required' });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Convert isDorothyPet to boolean properly
        const isDorothyPetBool = isDorothyPet === 'true' || isDorothyPet === true;
        console.log('🔄 Converting isDorothyPet for update:', { original: isDorothyPet, converted: isDorothyPetBool });
        
        // Update the pet record
        const petUpdateResult = await client.query(`
            UPDATE gallery_pets 
            SET pet_name = $1, story_description = $2, service_date = $3, is_dorothy_pet = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [petName, storyDescription || '', serviceDate || '', isDorothyPetBool, petId]);
        
        if (petUpdateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pet not found' };
        // Handle removals (array of URLs)
        const removalsRaw = req.body['remove[]'];
        const removals = Array.isArray(removalsRaw) ? removalsRaw : (removalsRaw ? [removalsRaw] : []);
        if (removals.length > 0) {
            console.log('🗑️ Removing images:', removals.length);
            // Delete from S3 (best-effort)
            for (const url of removals) {
                try { await deleteFromS3(url); } catch (e) { console.warn('S3 delete failed for', url, e.message); }
            }
            // Delete from DB
            await client.query(`DELETE FROM pet_images WHERE pet_id = $1 AND image_url = ANY($2::text[])`, [petId, removals]);
        }
);
        }
        
        // Add new images if provided
        let uploadedImagesCount = 0;
        if (newImages.length > 0) {
            console.log(`Processing ${newImages.length} new images for upload...`);
            
            // Get current image count to determine display order
            const currentImagesResult = await client.query('SELECT COUNT(*) as count FROM pet_images WHERE pet_id = $1', [petId]);
            let nextDisplayOrder = parseInt(currentImagesResult.rows[0].count);
            
            for (let index = 0; index < newImages.length; index++) {
                const file = newImages[index];
                
                try {
                    // Upload to S3
                    const s3Url = await uploadToS3(file, 'pets');
                    
                    // Extract S3 key for future deletion
                    const urlParts = s3Url.split('/');
                    const s3Key = urlParts.slice(-2).join('/');
                    
                    // Insert image record
                    await client.query(`
                        INSERT INTO pet_images (pet_id, image_url, s3_key, is_primary, display_order)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [petId, s3Url, s3Key, false, nextDisplayOrder + index]); // New images are not primary by default
                    
                    uploadedImagesCount++;
                    console.log(`New image ${index + 1} uploaded successfully: ${s3Url}`);
                } catch (uploadError) {
                    console.error(`Failed to upload new image ${index + 1}:`, uploadError);
                    // Continue with other images even if one fails
                }
            }
        }
        
        await client.query('COMMIT');
        
        console.log('✅ Pet updated successfully with story changes and new photos');
        
        res.json({ 
            success: true, 
            message: `Pet updated successfully! ${uploadedImagesCount > 0 ? `Added ${uploadedImagesCount} new photos.` : ''}`,
            isDorothyPet: isDorothyPetBool,
            newPhotosAdded: uploadedImagesCount
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database error:', error);
        res.status(500).json({ error: 'Failed to update pet story and photos' });
    } finally {
        client.release();
    }
});

// RATES MANAGEMENT ENDPOINTS (unchanged from previous version)

// Get all service rates (public endpoint)
app.get('/api/rates', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM service_rates WHERE is_active = TRUE ORDER BY service_type');
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to retrieve rates' });
    }
});

// Admin: Get all rates (including inactive)
app.get('/api/admin/rates', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM service_rates ORDER BY service_type');
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to retrieve rates' });
    }
});

// Admin: Get single rate by ID
app.get('/api/admin/rates/:id', authenticateAdmin, async (req, res) => {
    const rateId = req.params.id;
    
    try {
        const result = await pool.query('SELECT * FROM service_rates WHERE id = $1', [rateId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rate not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to retrieve rate' });
    }
});

// Admin: Create new rate
app.post('/api/admin/rates', authenticateAdmin, async (req, res) => {
    const { serviceType, ratePerUnit, unitType, description, isActive, isFeatured } = req.body;
    
    if (!serviceType || !ratePerUnit || !unitType) {
        return res.status(400).json({ error: 'Service type, rate per unit, and unit type are required' });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // If setting as featured, unset all other featured services first
        if (isFeatured) {
            await client.query('UPDATE service_rates SET is_featured = FALSE');
        }
        
        const result = await client.query(`
            INSERT INTO service_rates (service_type, rate_per_unit, unit_type, description, is_active, is_featured)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [serviceType, ratePerUnit, unitType, description || '', isActive !== false, isFeatured || false]);
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Rate created successfully',
            rateId: result.rows[0].id 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.constraint === 'service_rates_service_type_key') {
            res.status(400).json({ error: 'A rate for this service type already exists' });
        } else {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Failed to create rate' });
        }
    } finally {
        client.release();
    }
});

// Admin: Update rate
app.put('/api/admin/rates/:id', authenticateAdmin, async (req, res) => {
    const rateId = req.params.id;
    const { serviceType, ratePerUnit, unitType, description, isActive, isFeatured } = req.body;
    
    if (!serviceType || !ratePerUnit || !unitType) {
        return res.status(400).json({ error: 'Service type, rate per unit, and unit type are required' });
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // If setting as featured, unset all other featured services first
        if (isFeatured) {
            await client.query('UPDATE service_rates SET is_featured = FALSE');
        }
        
        const result = await client.query(`
            UPDATE service_rates 
            SET service_type = $1, rate_per_unit = $2, unit_type = $3, description = $4, is_active = $5, is_featured = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
        `, [serviceType, ratePerUnit, unitType, description || '', isActive !== false, isFeatured || false, rateId]);
        
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Rate not found' });
        }
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Rate updated successfully' 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.constraint === 'service_rates_service_type_key') {
            res.status(400).json({ error: 'A rate for this service type already exists' });
        } else {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Failed to update rate' });
        }
    } finally {
        client.release();
    }
});

// Admin: Set featured service
app.put('/api/admin/rates/:id/featured', authenticateAdmin, async (req, res) => {
    const rateId = req.params.id;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // First, unset all featured services
        await client.query('UPDATE service_rates SET is_featured = FALSE');
        
        // Then set this one as featured
        const result = await client.query('UPDATE service_rates SET is_featured = TRUE WHERE id = $1', [rateId]);
        
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Rate not found' });
        }
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Featured service updated successfully' 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to set featured service' });
    } finally {
        client.release();
    }
});

// Admin: Delete rate
app.delete('/api/admin/rates/:id', authenticateAdmin, async (req, res) => {
    const rateId = req.params.id;
    
    try {
        const result = await pool.query('DELETE FROM service_rates WHERE id = $1', [rateId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Rate not found' });
        }
        
        res.json({ success: true, message: 'Rate deleted successfully' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to delete rate' });
    }
});

// ADMIN AUTHENTICATION (unchanged)

// Admin login with JWT
app.post('/api/admin/auth', async (req, res) => {
    const { username, password } = req.body;
    
    // Simple hardcoded auth - in production you'd use proper hashing
    if (username === 'dorothy' && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign(
            { username: username, id: 1 },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '24h' }
        );
        
        // Update last login
        try {
            await pool.query('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE username = $1', [username]);
        } catch (error) {
            console.log('Could not update last login:', error.message);
        }
        
        res.json({ 
            success: true, 
            message: 'Authentication successful',
            token: token,
            user: { username: username }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Admin token validation
app.get('/api/admin/validate', authenticateAdmin, (req, res) => {
    res.json({ 
        success: true, 
        user: { username: req.admin.username }
    });
});

// Get all contacts (admin)
app.get('/api/admin/contacts', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to retrieve contacts' });
    }
});

// Enhanced email notification with better date formatting
async function sendEmailNotification(contactData) {
    const formatDateRange = () => {
        if (contactData.startDate && contactData.endDate) {
            const start = new Date(contactData.startDate).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            const end = new Date(contactData.endDate).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            return `${start} to ${end}`;
        } else if (contactData.startDate) {
            return new Date(contactData.startDate).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        }
        return contactData.dates || 'Not specified';
    };
    
    const emailHTML = `
        <h2>🐾 New Pet Sitting Request</h2>
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <p><strong>Request ID:</strong> #${contactData.id}</p>
            <p><strong>Date Submitted:</strong> ${new Date().toLocaleDateString()}</p>
            
            <h3>Customer Information:</h3>
            <ul>
                <li><strong>Name:</strong> ${contactData.name}</li>
                <li><strong>Email:</strong> ${contactData.email || 'Not provided'}</li>
                <li><strong>Phone:</strong> ${contactData.phone || 'Not provided'}</li>
                <li><strong>Best Time to Call:</strong> ${contactData.bestTime || 'Not specified'}</li>
            </ul>
            
            <h3>Service Details:</h3>
            <ul>
                <li><strong>Service Needed:</strong> ${contactData.service || 'Not specified'}</li>
                <li><strong>📅 Service Dates:</strong> ${formatDateRange()}</li>
            </ul>
            
            <h3>Pet Information:</h3>
            <p>${contactData.petInfo || 'No pet information provided'}</p>
            
            <h3>Additional Message:</h3>
            <p>${contactData.message || 'No additional message'}</p>
            
            <hr>
            <p><small>This request was submitted through dotsoflovepetsitting.com</small></p>
        </div>
    `;
    
    const msg = {
        to: ['dotty.j.woods@gmail.com', 'wwoods1@gmail.com'],
        from: 'dotsoflovepetsitting@gmail.com',
        subject: `🐾 New Pet Sitting Request from ${contactData.name}`,
        html: emailHTML,
    };
    
    try {
        await sgMail.send(msg);
        console.log('Email notification sent successfully to:', msg.to.join(', '));
    } catch (error) {
        console.error('Failed to send email notification:', error);
    }
}


// Catch-all route for SPA - MUST BE LAST
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});
// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pet Sitting Backend Service v2.1-checkbox-fix running on port ${PORT}`);
    console.log(`Server binding to 0.0.0.0:${PORT} for Railway compatibility`);
    console.log(`Email recipients: ${EMAIL_RECIPIENTS.join(', ')}`);
    console.log(`Database: PostgreSQL (${process.env.NODE_ENV})`);
    console.log(`S3 Storage: ${S3_BUCKET} (AWS SDK v3)`);
    console.log(`Deployment time: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    console.log('Database connection closed.');
    process.exit(0);
});
