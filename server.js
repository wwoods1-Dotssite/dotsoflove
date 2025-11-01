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

// ===============================
// GET All Pets with Images
// ===============================
app.get("/api/pets", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        gp.id,
        gp.pet_name,
        gp.story_description,
        gp.is_dorothy_pet,
        gp.created_at,
        gp.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'image_url', pi.image_url,
              'is_primary', pi.is_primary,
              'display_order', pi.display_order
            )
            ORDER BY pi.display_order ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS images
      FROM gallery_pets gp
      LEFT JOIN pet_images pi ON gp.id = pi.pet_id
      GROUP BY gp.id
      ORDER BY gp.is_dorothy_pet DESC, gp.id ASC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching pets with images:", err);
    res.status(500).json({ success: false, message: "Error loading pets" });
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

// ===============================
// ADD NEW PET
// ===============================
app.post("/api/pets", upload.array("images"), async (req, res) => {
  try {
    const { pet_name, story_description, is_dorothy_pet } = req.body;

    // Insert pet record first
    const petResult = await pool.query(
      `INSERT INTO gallery_pets (pet_name, story_description, is_dorothy_pet, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id`,
      [pet_name, story_description, is_dorothy_pet === "true"]
    );

    const petId = petResult.rows[0].id;

    // Handle image uploads if provided
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
        [petId, publicUrl, key, 0]
      );

      fs.unlinkSync(file.path);
    }

    res.json({ success: true, petId });
  } catch (err) {
    console.error("❌ Error adding new pet:", err);
    res.status(500).json({ success: false, message: "Server error adding new pet" });
  }
});

// ===============================
// UPDATE PET (fix for field name mismatch + S3 upload)
// ===============================
app.put("/api/pets/:id", upload.array("images"), async (req, res) => {
  try {
    const { id } = req.params;
    const { pet_name, story_description, is_dorothy_pet } = req.body;

    // Update main record
    await pool.query(
      `UPDATE gallery_pets 
       SET pet_name = $1, story_description = $2, is_dorothy_pet = $3, updated_at = NOW()
       WHERE id = $4`,
      [pet_name, story_description, is_dorothy_pet === "true", id]
    );

    // Handle new image uploads (optional)
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
    res.status(500).json({ success: false, message: "Server error updating pet" });
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

// ===============================
// DELETE SPECIFIC PET IMAGE
// ===============================
app.delete("/api/pets/:petId/images/:imageId", async (req, res) => {
  try {
    const { petId, imageId } = req.params;

    // Get S3 key before deleting from DB
    const result = await pool.query(
      "SELECT s3_key FROM pet_images WHERE id = $1 AND pet_id = $2",
      [imageId, petId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    const s3Key = result.rows[0].s3_key;

    // Delete from S3
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
        })
      );
      console.log(`🗑 Deleted from S3: ${s3Key}`);
    } catch (s3Err) {
      console.warn("⚠️ Failed to delete from S3 (continuing):", s3Err.message);
    }

    // Delete from DB
    await pool.query("DELETE FROM pet_images WHERE id = $1 AND pet_id = $2", [
      imageId,
      petId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting image:", err);
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

// ===============================
// CONTACT FORM SUBMISSION (SendGrid with reply handling)
// ===============================
import sgMail from "@sendgrid/mail"; // or: const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.post("/api/contact", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      best_time,
      service,
      start_date,
      end_date,
      pet_info,
      message,
    } = req.body;

    if (!name || !email || !service) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Insert into DB
    await pool.query(
      `INSERT INTO contacts (name, email, phone, best_time, service, start_date, end_date, pet_info, message, contacted, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW())`,
      [
        name,
        email,
        phone || "",
        best_time || "",
        service,
        start_date || null,
        end_date || null,
        pet_info || "",
        message || "",
      ]
    );

    // Format dates neatly for the email
    const formattedDates =
      start_date && end_date ? `${start_date} → ${end_date}` : "Not specified";

    // Admin notification email
    const adminMsg = {
      to: ["wwoods1@gmail.com", "dotty.j.woods@gmail.com"],
      from: {
        email: "no-reply@dotsoflovepetsitting.com",
        name: "Dot's of Love Pet Sitting 🐾",
      },
      subject: `🐾 New Contact Request from ${name}`,
      html: `
        <h2>New Contact Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Best Time:</strong> ${best_time || "N/A"}</p>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Dates:</strong> ${formattedDates}</p>
        <p><strong>Pet Info:</strong> ${pet_info || "N/A"}</p>
        <p><strong>Message:</strong> ${message || "N/A"}</p>
        <hr style="margin: 1rem 0; border: 0; border-top: 1px solid #ccc;" />
        <p style="font-style: italic; color: #555;">You can reply directly to this message — your response will go to the customer (${email}).</p>
      `,
      replyTo: {
        email, // if you hit “reply”, it’ll go to the customer
        name,
      },
    };

    // Thank-you email for the sender
    const thankYouMsg = {
      to: email,
      from: {
        email: "no-reply@dotsoflovepetsitting.com",
        name: "Dot's of Love Pet Sitting 🐾",
      },
      subject: "Thanks for contacting Dot’s of Love Pet Sitting!",
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for reaching out to Dot’s of Love Pet Sitting! We’ve received your request and will get back to you soon.</p>
        <p style="font-style: italic;">🐾 Dot & Team</p>
        <hr />
        <p style="font-size: 0.9rem; color: #666;">
          You’re receiving this message because you submitted the contact form on our website.<br/>
          If this wasn’t you, please ignore this message.
        </p>
      `,
    };

    // Send both in parallel
    try {
      await Promise.all([
        sgMail.sendMultiple(adminMsg),
        sgMail.send(thankYouMsg),
      ]);
      console.log(`📧 Contact email + thank-you sent successfully for ${name}`);
    } catch (emailErr) {
      console.error(
        "⚠️ SendGrid email failed:",
        emailErr.response?.body?.errors || emailErr
      );
    }

    console.log("📨 New contact form submission saved and emailed:", name);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving contact form:", err);
    res.status(500).json({
      success: false,
      message: "Server error submitting contact form",
    });
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
// SERVICE RATES (Admin)
// ===============================

// Get all service rates
app.get("/api/rates", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, service_type, rate_per_unit, unit_type, description, is_active, is_featured, created_at, updated_at 
       FROM service_rates 
       ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching rates:", err);
    res.status(500).json({ success: false, message: "Error loading rates" });
  }
});

// Add new service rate
app.post("/api/rates", async (req, res) => {
  try {
    const {
      service_type,
      rate_per_unit,
      unit_type,
      description,
      is_active,
      is_featured,
    } = req.body;

    await pool.query(
      `INSERT INTO service_rates 
       (service_type, rate_per_unit, unit_type, description, is_active, is_featured, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())`,
      [service_type, rate_per_unit, unit_type, description, is_featured === "true"]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error adding rate:", err);
    res.status(500).json({ success: false, message: "Server error adding rate" });
  }
});

// Update existing rate
app.put("/api/rates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_type,
      rate_per_unit,
      unit_type,
      description,
      is_featured,
    } = req.body;

    await pool.query(
      `UPDATE service_rates 
       SET service_type = $1, rate_per_unit = $2, unit_type = $3, description = $4, is_featured = $5, updated_at = NOW()
       WHERE id = $6`,
      [service_type, rate_per_unit, unit_type, description, is_featured === "true", id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating rate:", err);
    res.status(500).json({ success: false, message: "Server error updating rate" });
  }
});

// Delete rate
app.delete("/api/rates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM service_rates WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting rate:", err);
    res.status(500).json({ success: false, message: "Server error deleting rate" });
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
