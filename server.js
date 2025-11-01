// ================================
// server.js — CommonJS version for Railway
// ================================

const express = require("express");
const multer = require("multer");
const pkg = require("pg");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

dotenv.config();
const { Pool } = pkg;

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({ region: process.env.AWS_REGION });

// ----------------------
// Middleware
// ----------------------
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

// ----------------------
// Multer for local uploads (temporary)
// ----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname),
});
const upload = multer({ storage });

// ----------------------
// Health check + root
// ----------------------
app.get("/", (_req, res) => {
  res.send("✅ Dots of Love API running");
});

// ----------------------
// Admin authentication
// ----------------------
app.post("/api/admin/auth", async (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASSWORD
  ) {
    res.json({ success: true, token: "mock-admin-token" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// ----------------------
// Pets
// ----------------------

// Get all pets
app.get("/api/pets", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM gallery_pets ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching pets:", err);
    res.status(500).json({ success: false });
  }
});

// Get a single pet by ID (for edit modal)
app.get("/api/pets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const petQuery = await pool.query(
      "SELECT * FROM gallery_pets WHERE id = $1",
      [id]
    );

    if (petQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Pet not found" });
    }

    const imgQuery = await pool.query(
      "SELECT * FROM pet_images WHERE pet_id = $1 ORDER BY display_order ASC, id ASC",
      [id]
    );

    const pet = petQuery.rows[0];
    pet.images = imgQuery.rows;
    res.json(pet);
  } catch (err) {
    console.error("❌ Error fetching pet:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Add new pet
app.post("/api/pets", upload.array("images"), async (req, res) => {
  try {
    const { name, story, is_dorothy } = req.body;
    const petResult = await pool.query(
      "INSERT INTO gallery_pets (name, story, is_dorothy) VALUES ($1, $2, $3) RETURNING id",
      [name, story, is_dorothy === "true"]
    );
    const petId = petResult.rows[0].id;

    // Upload files to S3
    for (const file of req.files) {
      const fileStream = fs.createReadStream(file.path);
      const key = `pets/${Date.now()}_${file.originalname}`;

      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype,
      };
      await s3.send(new PutObjectCommand(uploadParams));

      const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      await pool.query(
        "INSERT INTO pet_images (pet_id, image_url, s3_key, display_order) VALUES ($1, $2, $3, $4)",
        [petId, publicUrl, key, 0]
      );
      fs.unlinkSync(file.path);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error adding pet:", err);
    res.status(500).json({ success: false });
  }
});

// Update pet
app.put("/api/pets/:id", upload.array("images"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, story, is_dorothy } = req.body;

    await pool.query(
      "UPDATE gallery_pets SET name = $1, story = $2, is_dorothy = $3 WHERE id = $4",
      [name, story, is_dorothy === "true", id]
    );

    // Optional: handle new uploaded images
    for (const file of req.files || []) {
      const fileStream = fs.createReadStream(file.path);
      const key = `pets/${Date.now()}_${file.originalname}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
          Body: fileStream,
          ContentType: file.mimetype,
        })
      );
      const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      await pool.query(
        "INSERT INTO pet_images (pet_id, image_url, s3_key, display_order) VALUES ($1, $2, $3, $4)",
        [id, publicUrl, key, 0]
      );
      fs.unlinkSync(file.path);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating pet:", err);
    res.status(500).json({ success: false });
  }
});

// Delete pet
app.delete("/api/pets/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Delete images from S3 first
    const imgs = await pool.query("SELECT s3_key FROM pet_images WHERE pet_id = $1", [id]);
    for (const row of imgs.rows) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: row.s3_key,
        })
      );
    }

    await pool.query("DELETE FROM pet_images WHERE pet_id = $1", [id]);
    await pool.query("DELETE FROM gallery_pets WHERE id = $1", [id]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting pet:", err);
    res.status(500).json({ success: false });
  }
});

// Delete a single pet image
app.delete("/api/pets/images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const imgQuery = await pool.query("SELECT s3_key FROM pet_images WHERE id = $1", [id]);
    if (imgQuery.rows.length === 0)
      return res.status(404).json({ success: false, message: "Image not found" });

    const s3Key = imgQuery.rows[0].s3_key;
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
      })
    );

    await pool.query("DELETE FROM pet_images WHERE id = $1", [id]);
    res.json({ success: true, message: "Image deleted" });
  } catch (err) {
    console.error("❌ Error deleting pet image:", err);
    res.status(500).json({ success: false, message: "Server error deleting image" });
  }
});

// Update image order
app.put("/api/pets/:petId/images/reorder", async (req, res) => {
  try {
    const { petId } = req.params;
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: "Invalid order format" });
    }

    const queries = order.map((id, index) =>
      pool.query("UPDATE pet_images SET display_order = $1 WHERE id = $2 AND pet_id = $3", [
        index,
        id,
        petId,
      ])
    );

    await Promise.all(queries);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating image order:", err);
    res.status(500).json({ success: false });
  }
});

// ----------------------
// Contacts (Admin Enhancements)
// ----------------------
app.get("/api/contacts", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM contacts WHERE contacted = false ORDER BY created_at ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Fetch contacts:", err);
    res.status(500).json({ success: false });
  }
});

app.put("/api/contacts/:id/contacted", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE contacts SET contacted = true WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Update contact:", err);
    res.status(500).json({ success: false });
  }
});

// ===============================
// SERVICE RATES
// ===============================
app.get("/api/rates", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, service_type, rate_per_unit, unit_type, description, is_active, is_featured
      FROM service_rates
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching rates:", err);
    res.status(500).json({ success: false, message: "Error loading rates" });
  }
});

// Update rate
app.put("/api/rates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { service_type, rate_per_unit, unit_type, description, featured } = req.body;
    await pool.query(
      `UPDATE service_rates
       SET service_type=$1, rate_per_unit=$2, unit_type=$3, description=$4, is_featured=$5, updated_at=NOW()
       WHERE id=$6`,
      [service_type, rate_per_unit, unit_type, description, featured, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating rate:", err);
    res.status(500).json({ success: false });
  }
});

// Delete rate
app.delete("/api/rates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM service_rates WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting rate:", err);
    res.status(500).json({ success: false });
  }
});

// ----------------------
// Start Server
// ----------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🪣 S3 Bucket: ${process.env.S3_BUCKET_NAME}`);
});
