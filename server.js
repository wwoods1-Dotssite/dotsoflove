// server.js - Pet Sitting Backend Service with Gallery
const express = require('express');
const sgMail = require('@sendgrid/mail');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['https://dotsoflovepetsitting.com', 'https://www.dotsoflovepetsitting.com','https://visionary-queijadas-65e069.netlify.app', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded images

// Set up multer for file uploads
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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

// Initialize SQLite database
const db = new sqlite3.Database('./contacts.db');

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

    // New gallery pets table
    db.run(`
        CREATE TABLE IF NOT EXISTS gallery_pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_name TEXT NOT NULL,
            story_description TEXT,
            service_date TEXT,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_dorothy_pet BOOLEAN DEFAULT 0
        )
    `);

    // Admin credentials table (simple auth)
    db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

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

// Gallery endpoints

// Get all gallery pets (public endpoint)
app.get('/api/gallery', (req, res) => {
    db.all('SELECT * FROM gallery_pets ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to retrieve gallery' });
        }
        res.json(rows);
    });
});

// Admin: Add new pet to gallery
app.post('/api/admin/gallery', upload.single('image'), (req, res) => {
    const { petName, storyDescription, serviceDate, isDorothyPet } = req.body;
    
    if (!petName) {
        return res.status(400).json({ error: 'Pet name is required' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const stmt = db.prepare(`
        INSERT INTO gallery_pets (pet_name, story_description, service_date, image_url, is_dorothy_pet)
        VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run([petName, storyDescription || '', serviceDate || '', imageUrl, isDorothyPet === 'true' ? 1 : 0], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to add pet to gallery' });
        }
        
        res.json({ 
            success: true, 
            message: 'Pet added to gallery successfully',
            petId: this.lastID 
        });
    });
    
    stmt.finalize();
});

// Admin: Delete pet from gallery
app.delete('/api/admin/gallery/:id', (req, res) => {
    const petId = req.params.id;
    
    // First get the image URL to delete the file
    db.get('SELECT image_url FROM gallery_pets WHERE id = ?', [petId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to find pet' });
        }
        
        if (row && row.image_url) {
            const imagePath = path.join(__dirname, row.image_url);
            fs.unlink(imagePath, (err) => {
                if (err) console.log('Could not delete image file:', err);
            });
        }
        
        // Delete from database
        db.run('DELETE FROM gallery_pets WHERE id = ?', [petId], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to delete pet' });
            }
            
            res.json({ success: true, message: 'Pet deleted successfully' });
        });
    });
});

// Simple admin authentication
app.post('/api/admin/auth', (req, res) => {
    const { username, password } = req.body;
    
    // Simple hardcoded auth - in production you'd use proper hashing
    if (username === 'dorothy' && password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true, message: 'Authentication successful' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Get all contacts (admin)
app.get('/api/contacts', (req, res) => {
    db.all('SELECT * FROM contacts ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to retrieve contacts' });
        }
        res.json(rows);
    });
});

// Email recipients management
app.put('/api/email-recipients', (req, res) => {
    const { recipients } = req.body;
    
    if (!Array.isArray(recipients)) {
        return res.status(400).json({ error: 'Recipients must be an array' });
    }
    
    EMAIL_RECIPIENTS.length = 0;
    EMAIL_RECIPIENTS.push(...recipients);
    
    res.json({ success: true, recipients: EMAIL_RECIPIENTS });
});

app.get('/api/email-recipients', (req, res) => {
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
