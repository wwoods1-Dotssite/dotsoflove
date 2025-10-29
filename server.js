// ==============================
// Dot’s of Love Pet Sitting - Backend (CommonJS)
// ==============================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { Pool } = require("pg");
const multer = require("multer");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// AWS S3 setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

// ==============================
// ROUTES
// ==============================

// ✅ Health Check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// ✅ Admin Login
app.post("/api/admin/auth", (req, res) => {
  const { username, password } = req.body;
  if (username === "dorothy" && password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: "mock-token-123" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// ✅ CONTACT CRUD
app.post("/api/contact", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      best_time,
      service,
      pet_info,
      dates,
      message,
      start_date,
      end_date,
    } = req.body;

    await pool.query(
      `INSERT INTO contacts (name, email, phone, best_time, service, pet_info, dates, message, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [name, email, phone, best_time, service, pet_info, dates, message, start_date, end_date]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Contact Save Error:", err);
    res.status(500).json({ success: false });
  }
});

app.get("/api/contact", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM contacts ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.delete("/api/contact/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM contacts WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ✅ RATES CRUD
app.get("/api/rates", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM service_rates ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post("/api/rates", async (req, res) => {
  try {
    const { service_type, rate_per_unit, unit_type, description } = req.body;
    await pool.query(
      `INSERT INTO service_rates (service_type, rate_per_unit, unit_type, description, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [service_type, rate_per_unit, unit_type, description]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Add Rate Error:", err);
    res.status(500).json({ success: false });
  }
});

app.put("/api/rates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { service_type, rate_per_unit, unit_type, description } = req.body;
    await pool.query(
      `UPDATE service_rates
       SET service_type=$1, rate_per_unit=$2, unit_type=$3, description=$4
       WHERE id=$5`,
      [service_type, rate_per_unit, unit_type, description, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Update Rate Error:", err);
    res.status(500).json({ success: false });
  }
});

app.delete("/api/rates/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM service_rates WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete Rate Error:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ PETS CRUD
app.get("/api/gallery", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.pet_name, p.story_description, p.is_dorothy_pet,
        COALESCE(json_agg(json_build_object(
          'id', i.id, 'image_url', i.image_url, 'is_primary', i.is_primary
        ) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS images
      FROM gallery_pets p
      LEFT JOIN pet_images i ON p.id = i.pet_id
      GROUP BY p.id
      ORDER BY p.id DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Fetch Gallery Error:", err);
    res.status(500).json({ success: false });
  }
});

app.post("/api/pets", async (req, res) => {
  try {
    const { pet_name, story_description, is_dorothy_pet } = req.body;
    await pool.query(
      "INSERT INTO gallery_pets (pet_name, story_description, is_dorothy_pet) VALUES ($1, $2, $3)",
      [pet_name, story_description, is_dorothy_pet ?? false]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Add Pet Error:", err);
    res.status(500).json({ success: false });
  }
});

app.post("/api/pets/:petId/images", upload.single("image"), async (req, res) => {
  try {
    const { petId } = req.params;
    const file = req.file;
    const key = `pets/${uuidv4()}-${file.originalname}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
    }));

    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    await pool.query("INSERT INTO pet_images (pet_id, image_url) VALUES ($1, $2)", [petId, url]);
    res.json({ success: true, image_url: url });
  } catch (err) {
    console.error("❌ Upload Pet Image Error:", err);
    res.status(500).json({ success: false });
  }
});

app.delete("/api/pets/:petId/images/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    const img = await pool.query("SELECT image_url FROM pet_images WHERE id = $1", [imageId]);
    if (!img.rowCount) return res.status(404).json({ success: false });

    const key = img.rows[0].image_url.split(".amazonaws.com/")[1];
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }));
    await pool.query("DELETE FROM pet_images WHERE id = $1", [imageId]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete Image Error:", err);
    res.status(500).json({ success: false });
  }
});

app.delete("/api/pets/:petId", async (req, res) => {
  try {
    await pool.query("DELETE FROM pet_images WHERE pet_id = $1", [req.params.petId]);
    await pool.query("DELETE FROM gallery_pets WHERE id = $1", [req.params.petId]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete Pet Error:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ Catch-All for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
