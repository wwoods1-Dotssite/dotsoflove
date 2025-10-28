// server.js — Cleaned-up unified backend for Rates and Services

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.options("*", cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const upload = multer({ storage: multer.memoryStorage() });

// -------------------------------------------------------------
// ✅ Unified Rates + Services endpoint
// -------------------------------------------------------------
app.get(["/api/rates", "/api/services"], async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        description AS service_type,
        description,
        rate_per_unit,
        unit_type,
        is_active,
        is_featured,
        created_at,
        ROW_NUMBER() OVER (ORDER BY is_featured DESC, created_at DESC) AS display_order
      FROM service_rates
      WHERE is_active = true
      ORDER BY is_featured DESC, created_at DESC;
    `);

    // When no active services are available, prevent "Loading..." from persisting
    if (!result.rows.length) {
      return res.json([{ service_type: "No services available", is_empty: true }]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching rates/services:", err);
    res.status(500).json({ error: "Failed to fetch service data" });
  }
});

// -------------------------------------------------------------
// ✅ Gallery endpoint (unchanged, just clean formatting)
// -------------------------------------------------------------
app.get("/api/gallery", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, COALESCE(json_agg(i.*) FILTER (WHERE i.id IS NOT NULL), '[]') AS images
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

// -------------------------------------------------------------
// ✅ Contact Requests endpoint
// -------------------------------------------------------------
app.get("/api/contacts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM contact_requests ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// -------------------------------------------------------------
// ✅ Mock Admin Authentication
// -------------------------------------------------------------
app.post("/api/admin/auth", (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER || "dorothy";
  const adminPass = process.env.ADMIN_PASS || "password123";
  if (username === adminUser && password === adminPass) {
    res.json({ success: true, token: "mock-token" });
  } else {
    res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

app.get("/api/admin/validate", (req, res) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader === "Bearer mock-token") {
    res.status(200).json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// -------------------------------------------------------------
// ✅ Gallery Management for Admin
// -------------------------------------------------------------
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

    res.status(201).json({ message: "Pet added successfully", petId });
  } catch (err) {
    console.error("Error adding pet:", err);
    res.status(500).json({ error: "Failed to add pet" });
  }
});

app.listen(port, () => console.log(`✅ Server running cleanly on port ${port}`));
