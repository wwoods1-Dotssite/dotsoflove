// CommonJS version for Node 18+ on Railway
const express = require("express");
const multer = require("multer");
const pkg = require("pg");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

dotenv.config();
const { Pool } = pkg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({ region: process.env.AWS_REGION });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

// Storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});
const upload = multer({ storage });

// ---------- ADMIN AUTH ----------
app.post("/api/admin/auth", async (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    res.json({ success: true, token: "mock-admin-token" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// ---------- UPDATE PET ----------
app.put("/api/pets/:id", async (req, res) => {
  try {
    const petId = req.params.id;
    const { pet_name, story_description, is_dorothy_pet } = req.body;
    const result = await pool.query(
      `UPDATE gallery_pets
       SET pet_name = $1, story_description = $2, is_dorothy_pet = $3
       WHERE id = $4 RETURNING *`,
      [pet_name, story_description, is_dorothy_pet, petId]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Pet not found" });
    res.json({ success: true, pet: result.rows[0] });
  } catch (err) {
    console.error("❌ Edit Pet Error:", err);
    res.status(500).json({ success: false, message: "Server error updating pet" });
  }
});

// ---------- DELETE PET ----------
app.delete("/api/pets/:id", async (req, res) => {
  try {
    const petId = req.params.id;
    const images = await pool.query("SELECT s3_key FROM pet_images WHERE pet_id = $1", [petId]);
    for (const img of images.rows) {
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: img.s3_key,
        }));
      } catch (s3Err) {
        console.warn("⚠️ S3 deletion warning:", s3Err.message);
      }
    }
    await pool.query("DELETE FROM pet_images WHERE pet_id = $1", [petId]);
    const result = await pool.query("DELETE FROM gallery_pets WHERE id = $1", [petId]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Pet not found" });
    res.json({ success: true, message: "Pet deleted successfully" });
  } catch (err) {
    console.error("❌ Delete Pet Error:", err);
    res.status(500).json({ success: false, message: "Server error deleting pet" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
