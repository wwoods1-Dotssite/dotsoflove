// server.js — Clean Railway-ready Express Backend with CORS

const express = require('express');
const cors = require('cors');
const app = express();

// ============================================================
// ✅ CORS Configuration
// ============================================================
app.use(
  cors({
    origin: [
      'https://dotsoflovepetsitting.com',   // Netlify site
      'https://dotsoflove.netlify.app',     // Netlify preview
      'http://localhost:8888',              // Local dev
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ============================================================
// ✅ Middleware
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ✅ Health Check
// ============================================================
app.get('/', (req, res) => {
  res.send('✅ Dot’s Pet Sitting Backend is running!');
});

// ============================================================
// ✅ Mock API Routes (for frontend testing)
// ============================================================

// -- Rates endpoint --
app.get('/api/rates', (req, res) => {
  res.json([
    {
      service_type: 'Dog Walking',
      rate_per_unit: 15.0,
      unit_type: 'per_walk',
      description: '30–45 minute walks to keep your dog happy and healthy',
      is_active: true,
      is_featured: true,
    },
    {
      service_type: 'Overnight Care',
      rate_per_unit: 50.0,
      unit_type: 'per_night',
      description: 'Overnight care in your home with 24/7 attention',
      is_active: true,
      is_featured: false,
    },
    {
      service_type: 'Holiday Visits',
      rate_per_unit: 65.0,
      unit_type: 'per_night',
      description: 'Special holiday and weekend care rates',
      is_active: true,
      is_featured: false,
    },
    {
      service_type: 'Check-ins & Feedings',
      rate_per_unit: 30.0,
      unit_type: 'per_visit',
      description: 'Short visits for feeding, playtime, or litter refresh',
      is_active: true,
      is_featured: false,
    },
  ]);
});

// -- Gallery endpoint --
app.get('/api/gallery', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Dotty and Beau',
      description: 'Our happy pup enjoying a walk!',
      imageUrl: 'https://place-puppy.com/400x400',
      is_dorothy_pet: true,
    },
    {
      id: 2,
      name: 'Happy Client',
      description: 'Another furry friend enjoying pet sitting!',
      imageUrl: 'https://placekitten.com/400/400',
      is_dorothy_pet: false,
    },
  ]);
});

// -- Auth endpoint (mocked) --
app.post('/api/admin/auth', (req, res) => {
  const { username, password } = req.body;
  if (username === 'dorothy' && password === 'password123') {
    res.json({ success: true, token: 'mock-jwt-token' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// ============================================================
// ✅ Server Startup
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Dot's Pet Sitting Backend running on port ${PORT}`);
});
