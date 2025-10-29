
// server.js (updated for Dot’s of Love)
import express from "express";
import multer from "multer";
import pkg from "pg";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();
const { Pool } = pkg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({ region: process.env.AWS_REGION });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Admin Auth
app.post("/api/admin/auth", async (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    res.json({ success: true, token: "mock-admin-token" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Pets CRUD
app.get("/api/pets", async (req, res) => {
  try {
    const pets = await pool.query(
      "SELECT p.*, COALESCE(json_agg(i) FILTER (WHERE i.id IS NOT NULL), '[]') AS images FROM gallery_pets p LEFT JOIN gallery_images i ON p.id = i.pet_id GROUP BY p.id ORDER BY p.id DESC"
    );
    res.json(pets.rows);
  } catch (err) {
    console.error("Error loading pets:", err);
    res.status(500).json({ success: false });
  }
});

app.post("/api/pets", upload.array("images"), async (req, res) => {
  try {
    const { pet_name, story_description, is_dorothy_pet } = req.body;
    const isDorothy = is_dorothy_pet === "true";
    const result = await pool.query(
      "INSERT INTO gallery_pets (pet_name, story_description, is_dorothy_pet) VALUES ($1, $2, $3) RETURNING id",
      [pet_name, story_description, isDorothy]
    );
    const petId = result.rows[0].id;

    if (req.files.length > 0) {
      for (const file of req.files) {
        await pool.query(
          "INSERT INTO gallery_images (pet_id, image_url, is_primary, display_order, s3_key) VALUES ($1, $2, $3, $4, $5)",
          [petId, `/uploads/${file.filename}`, false, 0, file.filename]
        );
      }
    }
    res.json({ success: true, id: petId });
  } catch (err) {
    console.error("❌ Add Pet Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Image (uses s3_key safely)
app.delete("/api/pets/:petId/images/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    const imgRes = await pool.query(
      "SELECT s3_key, image_url FROM gallery_images WHERE id = $1",
      [imageId]
    );
    if (!imgRes.rowCount) return res.status(404).json({ success: false, message: "Image not found" });

    const { s3_key, image_url } = imgRes.rows[0];
    if (s3_key) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: s3_key }));
        console.log(`🗑️ Deleted from S3: ${s3_key}`);
      } catch (s3Err) {
        console.warn("⚠️ S3 delete failed:", s3Err.message);
      }
    } else if (image_url.startsWith("/uploads/")) {
      try {
        await fs.promises.unlink(path.join("public", image_url));
      } catch (fsErr) {
        console.warn("⚠️ Local delete skipped:", fsErr.message);
      }
    }
    await pool.query("DELETE FROM gallery_images WHERE id = $1", [imageId]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete Image Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
