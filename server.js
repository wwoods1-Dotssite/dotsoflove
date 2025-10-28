// ==============================
// Dot’s of Love Pet Sitting - Backend (CommonJS version)
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

// ==============================
// Middleware
// ==============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// Database connection
// ==============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ==============================
// AWS S3 Client Setup
// ==============================
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ==============================
// ROUTES
// ==============================

// ✅ Health check route
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    dbConnected: !!pool,
    hasAdminPassword: !!process.env.ADMIN_PASSWORD,
  });
});

// ✅ Admin Auth Route
app.post(["/auth", "/api/auth", "/api/admin/auth"], (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("🧩 Admin login attempt:", username);

    if (username === "dorothy" && password === process.env.ADMIN_PASSWORD) {
      return res.json({
        success: true,
        token: "mock-token-123",
        message: "Login successful",
      });
    }

    res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error("❌ Admin auth error:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// ✅ Contact Form Handler
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
      startDate,
      endDate,
    } = req.body;

    await pool.query(
      `INSERT INTO contacts (name,email,phone,best_time,service,pet_info,dates,message,start_date,end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [name, email, phone, best_time, service, pet_info, dates, message, startDate, endDate]
    );

    console.log("📩 Contact saved:", name);
    res.json({ success: true, message: "Message saved successfully" });
  } catch (err) {
    console.error("❌ Contact error:", err);
    res.status(500).json({ success: false, message: "Failed to save contact" });
  }
});

// ✅ Rates
app.get("/api/rates", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM service_rates WHERE is_active = true ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Rates error:", err);
    res.status(500).json({ success: false, message: "Failed to load rates" });
  }
});

// ✅ Gallery
app.get("/api/gallery", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.pet_name, p.story_description, p.service_date, p.is_dorothy_pet,
        COALESCE(json_agg(json_build_object(
          'id', i.id,
          'image_url', i.image_url,
          'is_primary', i.is_primary,
          'display_order', i.display_order
        ) ORDER BY i.display_order) FILTER (WHERE i.id IS NOT NULL), '[]') AS images
      FROM gallery_pets p
      LEFT JOIN pet_images i ON p.id = i.pet_id
      GROUP BY p.id
      ORDER BY p.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Gallery error:", err);
    res.status(500).json({ success: false, message: "Failed to load gallery" });
  }
});

// ✅ Add Pet
app.post("/api/pets", async (req, res) => {
  try {
    const { pet_name, story_description, service_date, is_dorothy_pet } = req.body;
    const result = await pool.query(
      `INSERT INTO gallery_pets (pet_name,story_description,service_date,is_dorothy_pet)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [pet_name, story_description, service_date, is_dorothy_pet]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Add pet error:", err);
    res.status(500).json({ success: false, message: "Failed to add pet" });
  }
});

// ✅ Upload Pet Image
app.post("/api/pets/:petId/images", upload.single("image"), async (req, res) => {
  try {
    const { petId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const key = `pets/${uuidv4()}-${file.originalname}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    await pool.query(
      `INSERT INTO pet_images (pet_id,image_url,is_primary,display_order)
       VALUES ($1,$2,false,0)`,
      [petId, url]
    );

    console.log(`🖼️ Uploaded image for pet ${petId}`);
    res.json({ success: true, image_url: url });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, message: "Failed to upload image" });
  }
});

// ✅ Delete Pet Image
app.delete("/api/pets/:petId/images/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    const imgRes = await pool.query("SELECT image_url FROM pet_images WHERE id = $1", [imageId]);
    if (imgRes.rowCount === 0) return res.status(404).json({ success: false, message: "Not found" });

    const key = imgRes.rows[0].image_url.split(".amazonaws.com/")[1];
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }));
    await pool.query("DELETE FROM pet_images WHERE id = $1", [imageId]);
    console.log(`🗑️ Deleted image ${imageId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete image error:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ Delete Pet
app.delete("/api/pets/:petId", async (req, res) => {
  try {
    const { petId } = req.params;
    await pool.query("DELETE FROM pet_images WHERE pet_id = $1", [petId]);
    await pool.query("DELETE FROM gallery_pets WHERE id = $1", [petId]);
    console.log(`🐾 Deleted pet ${petId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete pet error:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ Explicit Admin Auth Route (fixes 404 issue)
app.post("/api/admin/auth", (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("🧩 Direct admin auth route hit");

    if (username === "dorothy" && password === process.env.ADMIN_PASSWORD) {
      return res.json({
        success: true,
        token: "mock-token-123",
        message: "Login successful",
      });
    }

    res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error("❌ Admin login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ✅ Catch-all (must be last)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==============================
// Start Server
// ==============================
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
