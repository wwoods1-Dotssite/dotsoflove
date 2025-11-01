// ==============================
//  Dots of Love Pet Sitting API
//  CommonJS + S3 + PostgreSQL
// ==============================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------- ENV + DB + S3 ----------
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ DB Connection Error:", err.message));

console.log(`✅ S3 client ready for bucket: ${process.env.S3_BUCKET_NAME}`);

// ---------- ADMIN AUTH ----------
app.post("/api/admin/auth", (req, res) => {
  const { username, password } = req.body;
  const validUser = username === process.env.ADMIN_USER;
  const validPass =
    password === process.env.ADMIN_PASSWORD ||
    password === process.env.ADMIN_PASS;
  if (validUser && validPass) {
    return res.json({ success: true, token: "mock-admin-token" });
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});

// ---------- PETS ----------
app.get("/api/pets", async (_req, res) => {
  try {
    const pets = await pool.query("SELECT * FROM gallery_pets ORDER BY id");
    const petIds = pets.rows.map((p) => p.id);
    const imgs =
      petIds.length > 0
        ? await pool.query(
            "SELECT * FROM pet_images WHERE pet_id = ANY($1) ORDER BY display_order",
            [petIds]
          )
        : { rows: [] };

    const map = {};
    imgs.rows.forEach((i) => {
      if (!map[i.pet_id]) map[i.pet_id] = [];
      map[i.pet_id].push(i);
    });

    res.json(
      pets.rows.map((p) => ({ ...p, images: map[p.id] || [] }))
    );
  } catch (err) {
    console.error("❌ GET /api/pets:", err);
    res.status(500).json({ error: "Server error loading pets" });
  }
});

// alias
app.get("/api/gallery", async (req, res) => {
  req.url = "/api/pets";
  app._router.handle(req, res);
});

// Create pet
app.post("/api/pets", async (req, res) => {
  const { pet_name, story_description, is_dorothy_pet } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO gallery_pets (pet_name, story_description, is_dorothy_pet)
       VALUES ($1,$2,$3) RETURNING *`,
      [pet_name, story_description, is_dorothy_pet]
    );
    res.json({ success: true, pet: result.rows[0] });
  } catch (err) {
    console.error("❌ Add Pet:", err);
    res.status(500).json({ success: false });
  }
});

// Get single pet by ID
app.get("/api/pets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const petQuery = await pool.query("SELECT * FROM pets WHERE id = $1", [id]);
    if (petQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Pet not found" });
    }

    // Fetch images associated with this pet
    const imgQuery = await pool.query(
      "SELECT * FROM pet_images WHERE pet_id = $1 ORDER BY id ASC",
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

// Update pet
app.put("/api/pets/:id", async (req, res) => {
  const { id } = req.params;
  const { pet_name, story_description, is_dorothy_pet } = req.body;
  try {
    const result = await pool.query(
      `UPDATE gallery_pets
         SET pet_name=$1, story_description=$2, is_dorothy_pet=$3
       WHERE id=$4 RETURNING *`,
      [pet_name, story_description, is_dorothy_pet, id]
    );
    if (!result.rowCount)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, pet: result.rows[0] });
  } catch (err) {
    console.error("❌ Edit Pet:", err);
    res.status(500).json({ success: false });
  }
});

// Delete pet
app.delete("/api/pets/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const imgs = await pool.query(
      "SELECT s3_key FROM pet_images WHERE pet_id=$1",
      [id]
    );
    for (const img of imgs.rows) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: img.s3_key,
          })
        );
      } catch (err) {
        console.warn("⚠️ S3 delete warn:", err.message);
      }
    }
    await pool.query("DELETE FROM pet_images WHERE pet_id=$1", [id]);
    await pool.query("DELETE FROM gallery_pets WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete Pet:", err);
    res.status(500).json({ success: false });
  }
});

// Delete single image
app.delete("/api/pets/:petId/images/:imageId", async (req, res) => {
  const { petId, imageId } = req.params;
  try {
    const img = await pool.query(
      "DELETE FROM pet_images WHERE id=$1 RETURNING s3_key",
      [imageId]
    );
    if (img.rows[0]) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: img.rows[0].s3_key,
        })
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete Image:", err);
    res.status(500).json({ success: false });
  }
});

// Reorder images
app.post("/api/pets/:id/images/reorder", async (req, res) => {
  const { id } = req.params;
  const { images } = req.body;
  try {
    const queries = images.map((img) =>
      pool.query(
        "UPDATE pet_images SET display_order=$1 WHERE id=$2 AND pet_id=$3",
        [img.display_order, img.id, id]
      )
    );
    await Promise.all(queries);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Reorder:", err);
    res.status(500).json({ success: false });
  }
});
// ---------- S3 UPLOAD PRESIGN ----------
app.post("/api/s3/upload-url", async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "Missing fileName or fileType" });
    }

    const Key = `pets/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;

    res.json({
      uploadUrl,
      publicUrl,
      s3_key: Key, // <-- fixed field name
    });
  } catch (err) {
    console.error("❌ S3 Upload Error:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});


// Record uploaded image
app.post("/api/pets/:id/images", async (req, res) => {
  const { id } = req.params;
  const { image_url, s3_key, display_order } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO pet_images (pet_id, image_url, s3_key, display_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, image_url, s3_key, display_order || 0]
    );
    res.json({ success: true, image: result.rows[0] });
  } catch (err) {
    console.error("❌ Record image:", err);
    res.status(500).json({ success: false });
  }
});

// ---------- RATES ----------
app.get("/api/rates", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM service_rates ORDER BY is_featured DESC, id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ GET /api/rates:", err);
    res.status(500).json({ error: "Server error loading rates" });
  }
});

// ---------- CONTACT ----------
// app.get("/api/contact", async (_req, res) => {
//  try {
//    const result = await pool.query(
//      "SELECT id,name,email,phone,best_time,service,pet_info,dates,start_date,end_date,message FROM contacts ORDER BY id DESC"
//    );
//    res.json(result.rows);
//  } catch (err) {
//    console.error("❌ GET /api/contact:", err);
//    res.status(500).json({ error: "Server error loading contacts" });
//  }
// });

// =========================
// Contacts (Admin Enhancements)
// =========================

// Get all uncontacted contacts sorted oldest -> newest
app.get("/api/contacts", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM contacts WHERE contacted = false ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Fetch contacts:", err);
    res.status(500).json({ success: false });
  }
});

// Mark contact as contacted
app.put("/api/contacts/:id/contacted", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE contacts SET contacted = true WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Update contacted:", err);
    res.status(500).json({ success: false });
  }
});


// ---------- START ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
