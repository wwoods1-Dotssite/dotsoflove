// server.js - Pet Sitting Backend Service
const express = require('express');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['https://dotsoflovepetsitting.com', 'https://www.dotsoflovepetsitting.com','https://visionary-queijadas-65e069.netlify.app', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Email configuration - Update these recipients as needed
const EMAIL_RECIPIENTS = [
    'dotty.j.woods@gmail.com',
    'wwoods1@gmail.com'
];

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Initialize SQLite database
const db = new sqlite3.Database('./contacts.db');

// Create contacts table if it doesn't exist
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Pet Sitting Backend is running!' });
});

// Submit contact form
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, bestTime, service, petInfo, dates, message } = req.body;
    
    console.log('Received contact form submission:', { name, email, phone });
    
    // Validate required fields
    if (!name || (!email && !phone)) {
        return res.status(400).json({ 
            error: 'Name and either email or phone number are required' 
        });
    }
    
    try {
        // Store in database
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
            
            // Send email notification
            sendEmailNotification({
                id: this.lastID,
                name,
                email,
                phone,
                bestTime,
                service,
                petInfo,
                dates,
                message
            });
        });
        
        stmt.finalize();
        
        res.json({ success: true, message: 'Contact request submitted successfully' });
        
    } catch (error) {
        console.error('Error processing contact:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all contacts (for admin view)
app.get('/api/contacts', (req, res) => {
    db.all('SELECT * FROM contacts ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to retrieve contacts' });
        }
        res.json(rows);
    });
});

// Update email recipients
app.put('/api/email-recipients', (req, res) => {
    const { recipients } = req.body;
    
    if (!Array.isArray(recipients)) {
        return res.status(400).json({ error: 'Recipients must be an array' });
    }
    
    // Update the global EMAIL_RECIPIENTS array
    EMAIL_RECIPIENTS.length = 0;
    EMAIL_RECIPIENTS.push(...recipients);
    
    res.json({ success: true, recipients: EMAIL_RECIPIENTS });
});

// Get current email recipients
app.get('/api/email-recipients', (req, res) => {
    res.json({ recipients: EMAIL_RECIPIENTS });
});

// Function to send email notification
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
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: EMAIL_RECIPIENTS.join(','),
        subject: `🐾 New Pet Sitting Request from ${contactData.name}`,
        html: emailHTML
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email notification sent successfully to:', EMAIL_RECIPIENTS.join(', '));
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
