// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { authenticateToken, authorizeRole } = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Import Routers ---
const authRoutes = require('./routes/auth.routes.js')(pool);
const usersRoutes = require('./routes/users.routes.js')(pool);
const eventsRoutes = require('./routes/events.routes.js')(pool); // This should now handle all its own sub-routes
const adminRoutes = require('./routes/admin.routes.js')(pool);

// --- API Routes ---

// Public Welcome Route
app.get('/', (req, res) => {
  res.send('Welcome to the Community Hub Backend API!');
});

// Authentication Routes (Public)
app.use('/api/auth', authRoutes);

// Protected User Routes (Auth required)
app.use('/api/users', authenticateToken, usersRoutes);

// *** CORRECTED EVENTS ROUTES MOUNTING ***
// Mount the entire events router at /api/events
app.use('/api/events', eventsRoutes);

// Protected Admin Routes (Auth & Admin Role required)
app.use('/api/admin', authenticateToken, authorizeRole(['admin']), adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Backend is healthy!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});