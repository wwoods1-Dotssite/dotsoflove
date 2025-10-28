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

// path helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// s3 setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const upload = multer({ storage: multer.memoryStorage() });

// ---- health ----
app.get("/api/health", (req, res) =>
  res.json({ ok: true, db: !!pool, hasAdminPassword: !!process.env.ADMIN_PASSWORD })
);

// ---- admin auth ----
app.post(["/auth", "/api/auth", "/api/admin/auth"], (req, res) => {
  const { username, password } = req.body;
  if (username === "dorothy" && password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true, token: "mock-token-123" });
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});

// ---- contact ----
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, best_time, service, pet_info, dates, message, startDate, endDate } =
      req.body;
    await pool.query(
      `INSERT INTO contacts (name,email,phone,best_time,service,pet_info,dates,message,start_date,end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [name, email, phone, best_time, service, pet_info, dates, message, startDate, endDate]
    );
    res.json({ success: true });
  } catch (e) {
    console.error("contact error", e);
    res.status(500).json({ success: false });
  }
});

// ---- rates ----
app.get("/api/rates", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM service_rates WHERE is_active = true ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// ---- gallery ----
app.get("/api/gallery", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.pet_name, p.story_description, p.service_date, p.is_dorothy_pet,
      COALESCE(json_agg(json_build_object('id',i.id,'image_url',i.image_url,'is_primary',i.is_primary,'display_order',i.display_order))
        FILTER (WHERE i.id IS NOT NULL), '[]') AS images
      FROM gallery_pets p
      LEFT JOIN pet_images i ON p.id = i.pet_id
      GROUP BY p.id ORDER BY p.id DESC`);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// ---- add pet ----
app.post("/api/pets", async (req, res) => {
  try {
    const { pet_name, story_description, service_date, is_dorothy_pet } = req.body;
    const result = await pool.query(
      `INSERT INTO gallery_pets (pet_name,story_description,service_date,is_dorothy_pet)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [pet_name, story_description, service_date, is_dorothy_pet]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// ---- upload image ----
app.post("/api/pets/:petId/images", upload.single("image"), async (req, res) => {
  try {
    const { petId } = req.params;
    if (!req.file) return res.status(400).json({ success: false });
    const key = `pets/${uuidv4()}-${req.file.originalname}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    await pool.query(
      `INSERT INTO pet_images (pet_id,image_url,is_primary,display_order) VALUES ($1,$2,false,0)`,
      [petId, url]
    );
    res.json({ success: true, image_url: url });
  } catch (e) {
    console.error("upload error", e);
    res.status(500).json({ success: false });
  }
});

// ---- delete image ----
app.delete("/api/pets/:petId/images/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    const r = await pool.query("SELECT image_url FROM pet_images WHERE id=$1", [imageId]);
    if (!r.rowCount) return res.status(404).json({ success: false });
    const key = r.rows[0].image_url.split(".amazonaws.com/")[1];
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }));
    await pool.query("DELETE FROM pet_images WHERE id=$1", [imageId]);
    res.json({ success: true });
  } catch (e) {
    console.error("delete image error", e);
    res.status(500).json({ success: false });
  }
});

// ---- delete pet ----
app.delete("/api/pets/:petId", async (req, res) => {
  try {
    const { petId } = req.params;
    await pool.query("DELETE FROM pet_images WHERE pet_id=$1", [petId]);
    await pool.query("DELETE FROM gallery_pets WHERE id=$1", [petId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// ---- catch-all ----
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// ---- listen ----
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
