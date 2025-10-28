// ==============================
// Dot’s of Love Pet Sitting - Backend
// ==============================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3001;

// Setup path helpers for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================
// Middleware
// ==============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
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
// ROUTES - API
// ==============================

// ✅ Health check route
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    dbConnected: !!pool,
    hasAdminPassword: !!process.env.ADMIN_PASSWORD,
  });
});

// ✅ Admin authentication (supports multiple paths)
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

    console.warn("❌ Invalid admin credentials");
    res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error("❌ Admin auth error:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// ✅ CONTACT FORM HANDLER
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
      `INSERT INTO contacts (name, email, phone, best_time, service, pet_info, dates, message, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [name, email, phone, best_time, service, pet_info, dates, message, startDate, endDate]
    );

    console.log("📩 New contact saved:", name);
    res.json({ success: true, message: "Message received and saved successfully!" });
  } catch (err) {
    console.error("❌ Contact form error:", err);
    res.status(500).json({ success: false, message: "Failed to save contact" });
  }
});

// ✅ FETCH SERVICES / RATES
app.get("/api/rates", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM service_rates WHERE is_active = true ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching rates:", err);
    res.status(500).json({ success: false, message: "Failed to fetch rates" });
  }
});

// ✅ FETCH GALLERY (Dorothy's + Client Pets)
app.get("/api/gallery", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.pet_name, p.story_description, p.service_date, p.is_dorothy_pet,
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
    console.error("❌ Error fetching gallery:", err);
    res.status(500).json({ success: false, message: "Failed to load gallery" });
  }
});

// ✅ ADD NEW PET
app.post("/api/pets", async (req, res) => {
  try {
    const { pet_name, story_description, service_date, is_dorothy_pet } = req.body;
    const result = await pool.query(
      `INSERT INTO gallery_pets (pet_name, story_description, service_date, is_dorothy_pet)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [pet_name, story_description, service_date, is_dorothy_pet]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error adding pet:", err);
    res.status(500).json({ success: false, message: "Failed to add pet" });
  }
});

// ✅ UPLOAD IMAGE FOR PET
app.post("/api/pets/:petId/images", upload.single("image"), async (req, res) => {
  try {
    const { petId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const imageKey = `pets/${uuidv4()}-${file.originalname}`;
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: imageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));
    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageKey}`;

    await pool.query(
      `INSERT INTO pet_images (pet_id, image_url, is_primary, display_order)
       VALUES ($1,$2,false,0)`,
      [petId, imageUrl]
    );

    console.log(`🖼️ Image uploaded for pet ${petId}`);
    res.json({ success: true, image_url: imageUrl });
  } catch (err) {
    console.error("❌ Error uploading pet image:", err);
    res.status(500).json({ success: false, message: "Failed to upload image" });
  }
});

// ✅ DELETE IMAGE
app.delete("/api/pets/:petId/images/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    const imageRes = await pool.query("SELECT image_url FROM pet_images WHERE id = $1", [imageId]);
    if (imageRes.rows.length === 0) return res.status(404).json({ message: "Image not found" });

    const imageUrl = imageRes.rows[0].image_url;
    const key = imageUrl.split(".amazonaws.com/")[1];

    await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }));
    await pool.query("DELETE FROM pet_images WHERE id = $1", [imageId]);

    console.log(`🗑️ Deleted image ${imageId}`);
    res.json({ success: true, message: "Image deleted" });
  } catch (err) {
    console.error("❌ Error deleting image:", err);
    res.status(500).json({ success: false, message: "Failed to delete image" });
  }
});

// ✅ DELETE PET
app.delete("/api/pets/:petId", async (req, res) => {
  try {
    const { petId } = req.params;
    await pool.query("DELETE FROM pet_images WHERE pet_id = $1", [petId]);
    await pool.query("DELETE FROM gallery_pets WHERE id = $1", [petId]);

    console.log(`🐾 Deleted pet ${petId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting pet:", err);
    res.status(500).json({ success: false, message: "Failed to delete pet" });
  }
});

// ==============================
// FRONTEND FALLBACK (must be last)
// ==============================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
