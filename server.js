// server.js - Dot’s of Love Pet Sitting backend (final, Railway-ready)
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// --- Global Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Universal CORS setup (for Netlify + local dev) ---
app.use(
  cors({
    origin: [
      'https://dotsoflove.netlify.app',
      'https://dotsoflovepetsitting.com',
      'http://localhost:8888',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// --- Debug header middleware ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  console.log(`➡️ ${req.method} ${req.path}`);
  next();
});

// --- Rates Endpoint ---
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

// --- Gallery Endpoint ---
app.get('/api/gallery', (req, res) => {
  res.json({
    pets: [
      {
        id: 1,
        name: 'Nimboo',
        type: 'Dog',
        image_url:
          'https://dotsoflove-pet-images.s3.us-east-2.amazonaws.com/nimboo.jpg',
        story: 'Nimboo loves long walks and peanut butter treats!',
      },
      {
        id: 2,
        name: 'Rafiki',
        type: 'Cat',
        image_url:
          'https://dotsoflove-pet-images.s3.us-east-2.amazonaws.com/rafiki.jpg',
        story: 'Rafiki is a curious cat with a big personality!',
      },
    ],
  });
});

// --- Pets Management Endpoint ---
app.get('/api/pets', (req, res) => {
  res.json({
    pets: [
      {
        id: 1,
        name: 'Nimboo',
        breed: 'Golden Retriever',
        age: 5,
        image_url:
          'https://dotsoflove-pet-images.s3.us-east-2.amazonaws.com/nimboo.jpg',
        description: 'Friendly and energetic, loves meeting new people!',
      },
      {
        id: 2,
        name: 'Rafiki',
        breed: 'Tabby Cat',
        age: 3,
        image_url:
          'https://dotsoflove-pet-images.s3.us-east-2.amazonaws.com/rafiki.jpg',
        description: 'Loves window naps and chasing feather toys.',
      },
    ],
  });
});

// --- Contact Requests Endpoint ---
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  console.log(`📩 New contact request from ${name} (${email}): ${message}`);
  res.json({ success: true, message: 'Your request has been received!' });
});

// --- Admin Authentication Mock ---
app.post('/api/admin/auth', (req, res) => {
  const { username, password } = req.body;
  if (username === 'dorothy' && password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true, token: 'mock-token-123' });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// --- Root Route ---
app.get('/', (req, res) => {
  res.send('🐾 Dot’s of Love Pet Sitting API is running and happy!');
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
