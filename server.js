// server.js - Pet Sitting Backend Service with Enhanced Gallery and Rates Management
const express = require('express');
const sgMail = require('@sendgrid/mail');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// JWT middleware for admin authentication - MOVED TO TOP
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
app.use('/uploads', express.static('uploads')); // Serve uploaded images

// Set up multer for file uploads - Enhanced to handle multiple files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Email configuration
const EMAIL_RECIPIENTS = [
    'dotty.j.woods@gmail.com',
    'wwoods1@gmail.com',
    'dotsoflovepetsitting@gmail.com'
];

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Create uploads and data directories if they don't exist
// Create uploads and data directories if they don't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Ensure the data directory exists (handle both dev and production paths)
const dataDir = process.env.NODE_ENV === 'production' ? '/app/data' : './data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database - Use persistent storage
const dbPath = process.env.NODE_ENV === 'production' ? '/app/data/contacts.db' : './contacts.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log(`Connected to SQLite database at ${dbPath}`);
    }
});

// Add this after database connection for debugging
console.log('🗃️  Database configuration:');
console.log('   Path:', dbPath);
console.log('   Environment:', process.env.NODE_ENV);
console.log('   Data dir exists:', fs.existsSync(path.dirname(dbPath)));
console.log('   DB file exists:', fs.existsSync(dbPath));

// List files in data directory if it exists
// const dataDir = path.dirname(dbPath);  duplicate declaration
if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    console.log('📂 Files in data directory:', files);
}

// Create tables
db.serialize(() => {
    // Existing contacts table
    db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            best_time TEXT,
            service TEXT,
            pet_info TEXT,
            dates TEXT,
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Updated gallery pets table with multiple images support
    db.run(`
        CREATE TABLE IF NOT EXISTS gallery_pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_name TEXT NOT NULL,
            story_description TEXT,
            service_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_dorothy_pet BOOLEAN DEFAULT 0
        )
    `);

    // New table for pet images (supports multiple images per pet)
    db.run(`
        CREATE TABLE IF NOT EXISTS pet_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            is_primary BOOLEAN DEFAULT 0,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES gallery_pets (id) ON DELETE CASCADE
        )
    `);

    // New rates table
    db.run(`
        CREATE TABLE IF NOT EXISTS service_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_type TEXT NOT NULL UNIQUE,
            rate_per_unit DECIMAL(10,2) NOT NULL,
            unit_type TEXT NOT NULL, -- 'per_day', 'per_visit', 'per_hour', etc.
            description TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Admin credentials table (enhanced with proper hashing)
    db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Add migration for featured services
    db.all("PRAGMA table_info(service_rates)", (err, columns) => {
        if (!err) {
            const hasFeaturedColumn = columns.some(col => col.name === 'is_featured');
            if (!hasFeaturedColumn) {
                console.log('Adding is_featured column to service_rates table...');
                db.run('ALTER TABLE service_rates ADD COLUMN is_featured BOOLEAN DEFAULT 0', (err) => {
                    if (err) {
                        console.error('Error adding is_featured column:', err);
                    } else {
                        console.log('Successfully added is_featured column');
                        // Set the first rate as featured if none are featured
                        db.get('SELECT COUNT(*) as count FROM service_rates WHERE is_featured = 1', (err, row) => {
                            if (!err && row.count === 0) {
                                db.run('UPDATE service_rates SET is_featured = 1 WHERE id = (SELECT id FROM service_rates ORDER BY id LIMIT 1)');
                                console.log('Set first service as featured by default');
                            }
                        });
                    }
                });
            }
        }
    });

    // Insert default rates if none exist (only on first run)
    db.get('SELECT COUNT(*) as count FROM service_rates', (err, row) => {
        if (!err && row.count === 0) {
            console.log('Initializing default rates...');
            const defaultRates = [
                ['Pet Sitting (Overnight)', 75.00, 'per_night', 'Overnight care in your home with 24/7 attention'],
                ['Dog Walking', 25.00, 'per_walk', '30-45 minute walks to keep your dog happy and healthy'],
                ['Pet Visits', 30.00, 'per_visit', 'Check-ins, feeding, and care visits throughout the day'],
                ['Holiday/Weekend Rate', 85.00, 'per_night', 'Special holiday and weekend care rates']
            ];
            
            const stmt = db.prepare('INSERT INTO service_rates (service_type, rate_per_unit, unit_type, description) VALUES (?, ?, ?, ?)');
            defaultRates.forEach(rate => {
                stmt.run(rate);
            });
            stmt.finalize();
            console.log('Default rates initialized successfully');
        }
    });

    // Check if we need to migrate existing gallery data
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='gallery_pets'", (err, row) => {
        if (!err && row) {
            // Check if image_url column still exists (old schema)
            db.all("PRAGMA table_info(gallery_pets)", (err, columns) => {
                if (!err) {
                    const hasImageUrl = columns.some(col => col.name === 'image_url');
                    if (hasImageUrl) {
                        console.log('Migrating existing gallery data...');
                        // Migrate existing image_url data to new pet_images table
                        db.all('SELECT id, image_url FROM gallery_pets WHERE image_url IS NOT NULL', (err, pets) => {
                            if (!err && pets.length > 0) {
                                const insertStmt = db.prepare('INSERT INTO pet_images (pet_id, image_url, is_primary, display_order) VALUES (?, ?, 1, 0)');
                                pets.forEach(pet => {
                                    insertStmt.run([pet.id, pet.image_url]);
                                });
                                insertStmt.finalize();
                                
                                // Remove image_url column from gallery_pets
                                db.run('ALTER TABLE gallery_pets DROP COLUMN image_url', (err) => {
                                    if (err) console.log('Note: Could not drop image_url column, but migration completed');
                                });
                                console.log('Gallery migration completed successfully');
                            }
                        });
                    }
                }
            });
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Pet Sitting Backend is running!' });
});

// Existing contact form endpoint
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, bestTime, service, petInfo, dates, message } = req.body;
    
    console.log('Received contact form submission:', { name, email, phone });
    
    if (!name || (!email && !phone)) {
        return res.status(400).json({ 
            error: 'Name and either email or phone number are required' 
        });
    }
    
    try {
        const stmt = db.prepare(`
            INSERT INTO contacts (name, email, phone, best_time, service, pet_info, dates, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([name, email, phone, bestTime, service, petInfo, dates, message], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to save contact information' });
            }
            
            console.log('Contact saved to database with ID:', this.lastID);
            
            sendEmailNotification({
                id: this.lastID,
                name, email, phone, bestTime, service, petInfo, dates, message
            });
        });
        
        stmt.finalize();
        res.json({ success: true, message: 'Contact request submitted successfully' });
        
    } catch (error) {
        console.error('Error processing contact:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========== ENHANCED GALLERY ENDPOINTS ==========

// Get all gallery pets with their images (public endpoint)
app.get('/api/gallery', (req, res) => {
    const query = `
        SELECT 
            p.*,
            GROUP_CONCAT(
                json_object(
                    'id', i.id,
                    'url', i.image_url,
                    'isPrimary', i.is_primary,
                    'displayOrder', i.display_order
                )
                ORDER BY i.display_order, i.created_at
            ) as images
        FROM gallery_pets p
        LEFT JOIN pet_images i ON p.id = i.pet_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to retrieve gallery' });
        }
        
        // Parse the JSON images data
        const processedRows = rows.map(row => ({
            ...row,
            images: row.images ? row.images.split(',').map(imgStr => {
                try {
                    return JSON.parse(imgStr);
                } catch (e) {
                    return null;
                }
            }).filter(img => img !== null) : []
        }));
        
        res.json(processedRows);
    });
});

// Get single pet with images
app.get('/api/gallery/:id', (req, res) => {
    const petId = req.params.id;
    
    const query = `
        SELECT 
            p.*,
            GROUP_CONCAT(
                json_object(
                    'id', i.id,
                    'url', i.image_url,
                    'isPrimary', i.is_primary,
                    'displayOrder', i.display_order
                )
                ORDER BY i.display_order, i.created_at
            ) as images
        FROM gallery_pets p
        LEFT JOIN pet_images i ON p.id = i.pet_id
        WHERE p.id = ?
        GROUP BY p.id
    `;
    
    db.get(query, [petId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to retrieve pet' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        
        // Parse the JSON images data
        const processedRow = {
            ...row,
            images: row.images ? row.images.split(',').map(imgStr => {
                try {
                    return JSON.parse(imgStr);
                } catch (e) {
                    return null;
                }
            }).filter(img => img !== null) : []
        };
        
        res.json(processedRow);
    });
});

// Admin: Add new pet to gallery with multiple images
app.post('/api/admin/gallery', authenticateAdmin, upload.array('images', 10), (req, res) => {
    const { petName, storyDescription, serviceDate, isDorothyPet } = req.body;
    
    if (!petName) {
        return res.status(400).json({ error: 'Pet name is required' });
    }

    db.serialize(() => {
        // Insert pet record
        const stmt = db.prepare(`
            INSERT INTO gallery_pets (pet_name, story_description, service_date, is_dorothy_pet)
            VALUES (?, ?, ?, ?)
        `);
        
        stmt.run([petName, storyDescription || '', serviceDate || '', isDorothyPet === 'true' ? 1 : 0], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to add pet to gallery' });
            }
            
            const petId = this.lastID;
            
            // Insert images if any
            if (req.files && req.files.length > 0) {
                const imageStmt = db.prepare(`
                    INSERT INTO pet_images (pet_id, image_url, is_primary, display_order)
                    VALUES (?, ?, ?, ?)
                `);
                
                req.files.forEach((file, index) => {
                    const imageUrl = `/uploads/${file.filename}`;
                    const isPrimary = index === 0 ? 1 : 0; // First image is primary
                    imageStmt.run([petId, imageUrl, isPrimary, index]);
                });
                
                imageStmt.finalize();
            }
            
            res.json({ 
                success: true, 
                message: 'Pet added to gallery successfully',
                petId: petId 
            });
        });
        
        stmt.finalize();
    });
});

// Admin: Update existing pet story and details
app.put('/api/admin/gallery/:id', authenticateAdmin, (req, res) => {
    const petId = req.params.id;
    const { petName, storyDescription, serviceDate, isDorothyPet } = req.body;
    
    if (!petName) {
        return res.status(400).json({ error: 'Pet name is required' });
    }
    
    const stmt = db.prepare(`
        UPDATE gallery_pets 
        SET pet_name = ?, story_description = ?, service_date = ?, is_dorothy_pet = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    
    stmt.run([petName, storyDescription || '', serviceDate || '', isDorothyPet === 'true' ? 1 : 0, petId], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to update pet' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Pet updated successfully' 
        });
    });
    
    stmt.finalize();
});

// Admin: Delete pet from gallery (and all associated images)
app.delete('/api/admin/gallery/:id', authenticateAdmin, (req, res) => {
    const petId = req.params.id;
    
    // First get all image URLs to delete the files
    db.all('SELECT image_url FROM pet_images WHERE pet_id = ?', [petId], (err, images) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to find pet images' });
        }
        
        // Delete all image files
        images.forEach(image => {
            const imagePath = path.join(__dirname, image.image_url);
            fs.unlink(imagePath, (err) => {
                if (err) console.log('Could not delete image file:', err);
            });
        });
        
        db.serialize(() => {
            // Delete images from database
            db.run('DELETE FROM pet_images WHERE pet_id = ?', [petId]);
            
            // Delete pet from database
            db.run('DELETE FROM gallery_pets WHERE id = ?', [petId], function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to delete pet' });
                }
                
                res.json({ success: true, message: 'Pet and all images deleted successfully' });
            });
        });
    });
});

// ========== RATES MANAGEMENT ENDPOINTS ==========

// Get all service rates (public endpoint)
app.get('/api/rates', (req, res) => {
    db.all('SELECT * FROM service_rates WHERE is_active = 1 ORDER BY service_type', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to retrieve rates' });
        }
        res.json(rows);
    });
});

// Debug: Check database schema and featured services
app.get('/api/admin/debug/featured', authenticateAdmin, (req, res) => {
    console.log('Debug endpoint called - checking featured services');
    
    db.all("PRAGMA table_info(service_rates)", (err, columns) => {
        if (err) {
            console.error('Error checking schema:', err);
            return res.status(500).json({ error: 'Database error checking schema' });
        }
        
        const hasFeaturedColumn = columns.some(col => col.name === 'is_featured');
        
        if (!hasFeaturedColumn) {
            return res.json({
                schema_ok: false,
                message: 'is_featured column missing',
                columns: columns.map(col => col.name)
            });
        }
        
        // Check current featured services
        db.all('SELECT id, service_type, is_featured FROM service_rates ORDER BY service_type', (err, rates) => {
            if (err) {
                console.error('Error querying rates:', err);
                return res.status(500).json({ error: 'Error querying rates' });
            }
            
            const featuredCount = rates.filter(r => r.is_featured).length;
            
            console.log(`Found ${featuredCount} featured services out of ${rates.length} total`);
            
            res.json({
                schema_ok: true,
                featured_count: featuredCount,
                all_rates: rates,
                featured_rates: rates.filter(r => r.is_featured)
            });
        });
    });
});

// Fix: Migrate database to add is_featured column if missing
app.post('/api/admin/migrate/featured', authenticateAdmin, (req, res) => {
    console.log('Migration endpoint called');
    
    db.all("PRAGMA table_info(service_rates)", (err, columns) => {
        if (err) {
            console.error('Migration error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const hasFeaturedColumn = columns.some(col => col.name === 'is_featured');
        if (!hasFeaturedColumn) {
            console.log('Adding is_featured column to service_rates table...');
            db.run('ALTER TABLE service_rates ADD COLUMN is_featured BOOLEAN DEFAULT 0', (err) => {
                if (err) {
                    console.error('Error adding is_featured column:', err);
                    return res.status(500).json({ error: 'Migration failed: ' + err.message });
                }
                
                console.log('Successfully added is_featured column');
                // Set the first rate as featured if none are featured
                db.get('SELECT COUNT(*) as count FROM service_rates WHERE is_featured = 1', (err, row) => {
                    if (!err && row.count === 0) {
                        db.run('UPDATE service_rates SET is_featured = 1 WHERE id = (SELECT id FROM service_rates ORDER BY id LIMIT 1)', (err) => {
                            if (err) {
                                console.error('Error setting default featured:', err);
                            } else {
                                console.log('Set first service as featured by default');
                            }
                            res.json({ 
                                success: true, 
                                message: 'Migration completed and default featured service set' 
                            });
                        });
                    } else {
                        res.json({ 
                            success: true, 
                            message: 'Migration completed' 
                        });
                    }
                });
            });
        } else {
            res.json({ 
                success: true, 
                message: 'Column already exists - no migration needed' 
            });
        }
    });
});

// Admin: Get all rates (including inactive)
app.get('/api/admin/rates', authenticateAdmin, (req, res) => {
    db.all('SELECT * FROM service_rates ORDER BY service_type', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to retrieve rates' });
        }
        res.json(rows);
    });
});

// Admin: Get single rate by ID
app.get('/api/admin/rates/:id', authenticateAdmin, (req, res) => {
    const rateId = req.params.id;
    
    db.get('SELECT * FROM service_rates WHERE id = ?', [rateId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to retrieve rate' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Rate not found' });
        }
        
        res.json(row);
    });
});

// Admin: Create new rate (updated)
app.post('/api/admin/rates', authenticateAdmin, (req, res) => {
    const { serviceType, ratePerUnit, unitType, description, isActive, isFeatured } = req.body;
    
    if (!serviceType || !ratePerUnit || !unitType) {
        return res.status(400).json({ error: 'Service type, rate per unit, and unit type are required' });
    }
    
    db.serialize(() => {
        // If setting as featured, unset all other featured services first
        if (isFeatured) {
            db.run('UPDATE service_rates SET is_featured = 0');
        }
        
        const stmt = db.prepare(`
            INSERT INTO service_rates (service_type, rate_per_unit, unit_type, description, is_active, is_featured)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([serviceType, ratePerUnit, unitType, description || '', isActive !== false ? 1 : 0, isFeatured ? 1 : 0], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'A rate for this service type already exists' });
                }
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to create rate' });
            }
            
            res.json({ 
                success: true, 
                message: 'Rate created successfully',
                rateId: this.lastID 
            });
        });
        
        stmt.finalize();
    });
});

// Admin: Update rate (updated)
app.put('/api/admin/rates/:id', authenticateAdmin, (req, res) => {
    const rateId = req.params.id;
    const { serviceType, ratePerUnit, unitType, description, isActive, isFeatured } = req.body;
    
    if (!serviceType || !ratePerUnit || !unitType) {
        return res.status(400).json({ error: 'Service type, rate per unit, and unit type are required' });
    }
    
    db.serialize(() => {
        // If setting as featured, unset all other featured services first
        if (isFeatured) {
            db.run('UPDATE service_rates SET is_featured = 0');
        }
        
        const stmt = db.prepare(`
            UPDATE service_rates 
            SET service_type = ?, rate_per_unit = ?, unit_type = ?, description = ?, is_active = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.run([serviceType, ratePerUnit, unitType, description || '', isActive !== false ? 1 : 0, isFeatured ? 1 : 0, rateId], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'A rate for this service type already exists' });
                }
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update rate' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Rate not found' });
            }
            
            res.json({ 
                success: true, 
                message: 'Rate updated successfully' 
            });
        });
        
        stmt.finalize();
    });
});

// New endpoint: Set featured service
app.put('/api/admin/rates/:id/featured', authenticateAdmin, (req, res) => {
    const rateId = req.params.id;
    
    db.serialize(() => {
        // First, unset all featured services
        db.run('UPDATE service_rates SET is_featured = 0', (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update featured status' });
            }
            
            // Then set this one as featured
            db.run('UPDATE service_rates SET is_featured = 1 WHERE id = ?', [rateId], function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to set featured service' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Rate not found' });
                }
                
                res.json({ 
                    success: true, 
                    message: 'Featured service updated successfully' 
                });
            });
        });
    });
});

// Admin: Delete rate
app.delete('/api/admin/rates/:id', authenticateAdmin, (req, res) => {
    const rateId = req.params.id;
    
    db.run('DELETE FROM service_rates WHERE id = ?', [rateId], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to delete rate' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Rate not found' });
        }
        
        res.json({ success: true, message: 'Rate deleted successfully' });
    });
});

// ========== ENHANCED ADMIN AUTHENTICATION ==========

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
        db.run('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE username = ?', [username]);
        
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
app.get('/api/admin/contacts', authenticateAdmin, (req, res) => {
    db.all('SELECT * FROM contacts ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to retrieve contacts' });
        }
        res.json(rows);
    });
});

// Email recipients management
app.put('/api/admin/email-recipients', authenticateAdmin, (req, res) => {
    const { recipients } = req.body;
    
    if (!Array.isArray(recipients)) {
        return res.status(400).json({ error: 'Recipients must be an array' });
    }
    
    EMAIL_RECIPIENTS.length = 0;
    EMAIL_RECIPIENTS.push(...recipients);
    
    res.json({ success: true, recipients: EMAIL_RECIPIENTS });
});

app.get('/api/admin/email-recipients', authenticateAdmin, (req, res) => {
    res.json({ recipients: EMAIL_RECIPIENTS });
});

// Email notification function
async function sendEmailNotification(contactData) {
    const emailHTML = `
        <h2>🐾 New Pet Sitting Request</h2>
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <p><strong>Request ID:</strong> #${contactData.id}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            
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
                <li><strong>Preferred Dates:</strong> ${contactData.dates || 'Not specified'}</li>
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

// Start server
app.listen(PORT, () => {
    console.log(`🐾 Pet Sitting Backend Service running on port ${PORT}`);
    console.log(`📧 Email recipients: ${EMAIL_RECIPIENTS.join(', ')}`);
    console.log(`💾 Database path: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
