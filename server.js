// server.js - Dot’s of Love Pet Sitting backend (CommonJS compatible)
const express = require('express');
const cors = require('cors');
const pg = require('pg');
const multer = require('multer');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// --- PostgreSQL ---
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- AWS S3 Setup ---
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-2',
});
const s3 = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      'https://dotsoflove.netlify.app',
      'https://dotsoflovepetsitting.com',
      'http://localhost:8888',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path}`);
  next();
});

// =====================================
// ✅ Rates Endpoint (DB version)
// =====================================
app.get('/api/rates', async (req, res) => {
  try {
    const query = `
      SELECT id, service_type, rate_per_unit, unit_type, description, is_active, is_featured
      FROM service_rates
      WHERE is_active = true
      ORDER BY is_featured DESC, id ASC;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching rates:', err);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// =====================================
// ✅ Gallery Endpoint (pets + images)
// =====================================
app.get('/api/gallery', async (req, res) => {
  try {
    const query = `
      SELECT 
        gp.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'is_primary', pi.is_primary,
              'display_order', pi.display_order
            )
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS images
      FROM gallery_pets gp
      LEFT JOIN pet_images pi ON gp.id = pi.pet_id
      GROUP BY gp.id
      ORDER BY gp.id DESC;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching gallery:', err);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// =====================================
// ✅ Admin: Add a New Pet
// =====================================
app.post('/api/pets', async (req, res) => {
  try {
    const { pet_name, story_description, service_date, is_dorothy_pet } = req.body;
    const insertQuery = `
      INSERT INTO gallery_pets (pet_name, story_description, service_date, is_dorothy_pet)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await pool.query(insertQuery, [pet_name, story_description, service_date, is_dorothy_pet]);
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Error adding pet:', err);
    res.status(500).json({ error: 'Failed to add pet' });
  }
});

// =====================================
// ✅ Admin: Upload New Pet Image
// =====================================
app.post('/api/pets/:id/images', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = `${uuidv4()}-${req.file.originalname}`;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    };

    const uploadResult = await s3.upload(params).promise();
    const imageUrl = uploadResult.Location;

    await pool.query(
      'INSERT INTO pet_images (pet_id, image_url, is_primary, display_order) VALUES ($1, $2, $3, $4)',
      [id, imageUrl, false, 0]
    );

    res.json({ success: true, image_url: imageUrl });
  } catch (err) {
    console.error('❌ Error uploading image:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// =====================================
// ✅ Admin: Delete Pet Image
// =====================================
app.delete('/api/pets/:id/images/:imageId', async (req, res) => {
  const { id, imageId } = req.params;
  try {
    await pool.query('DELETE FROM pet_images WHERE id = $1 AND pet_id = $2', [imageId, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// =====================================
// ✅ Admin: Delete Pet
// =====================================
app.delete('/api/pets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM pet_images WHERE pet_id = $1', [id]);
    await pool.query('DELETE FROM gallery_pets WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting pet:', err);
    res.status(500).json({ error: 'Failed to delete pet' });
  }
});

// =====================================
// ✅ Contact Form — persist in DB
// =====================================
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, best_time, service, pet_info, dates, message, startDate, endDate } = req.body;

    await pool.query(
      `INSERT INTO contacts (name, email, phone, best_time, service, pet_info, dates, message, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [name, email, phone, best_time, service, pet_info, dates, message, startDate, endDate]
    );

    res.json({ success: true, message: 'Message received and saved successfully!' });
  } catch (err) {
    console.error('❌ Error saving contact:', err);
    res.status(500).json({ success: false, message: 'Failed to save contact' });
  }
});

// =====================================
// ✅ Admin Auth (alias route support)
// =====================================
app.post(['/auth', '/api/admin/auth'], (req, res) => {
  const { username, password } = req.body;
  if (username === 'dorothy' && password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true, token: 'mock-token-123' });
  }
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// =====================================
// ✅ Root + Error Handler
// =====================================
app.get('/', (req, res) => {
  res.send('🐾 Dot’s of Love Pet Sitting API (Postgres + S3 + Contacts connected)');
});

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
