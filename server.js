// server.js - Fixed version with CORS configured properly

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// ✅ Enable CORS globally before any routes
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PostgreSQL setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// AWS S3 client setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Health check endpoint
app.get("/", (req, res) => {
  res.send("Dot's of Love Pet Sitting API running successfully.");
});

// ✅ Example routes
app.get("/api/rates", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM service_rates WHERE is_active = true ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching rates:", err);
    res.status(500).json({ error: "Failed to fetch rates" });
  }
});

app.get("/api/gallery", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, json_agg(i.*) AS images
      FROM pets p
      LEFT JOIN pet_images i ON p.id = i.pet_id
      GROUP BY p.id
      ORDER BY p.id;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching gallery:", err);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

// ✅ Example POST for uploads
app.post("/api/admin/gallery", upload.array("images"), async (req, res) => {
  try {
    const { pet_name, story_description, service_date, is_dorothy_pet } = req.body;
    const newPet = await pool.query(
      `INSERT INTO pets (pet_name, story_description, service_date, is_dorothy_pet)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [pet_name, story_description, service_date, is_dorothy_pet === "true"]
    );
    const petId = newPet.rows[0].id;

    if (req.files?.length) {
      for (const file of req.files) {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `gallery/${petId}-${Date.now()}-${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype
        };
        await s3.send(new PutObjectCommand(params));
      }
    }

    res.status(201).json({ message: "Pet added successfully" });
  } catch (err) {
    console.error("Error adding pet:", err);
    res.status(500).json({ error: "Failed to add pet" });
  }
});

// ✅ Contact requests (example route)
app.get("/api/contacts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM contact_requests ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
