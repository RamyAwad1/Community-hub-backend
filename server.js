
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg'); 
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 5000; 

const usersRoutes = require('./routes/users_routes.js'); 

// --- Middleware ---
app.use(cors()); 
app.use(express.json()); 

// --- PostgreSQL Database Connection Pool ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test the database connection when the server starts
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client from pool:', err.stack);
  }
  console.log('Successfully connected to PostgreSQL database!');
  client.query('SELECT NOW()', (err, result) => {
    release(); // Release the client back to the pool
    if (err) {
      return console.error('Error executing test query', err.stack);
    }
    console.log('Database test query (SELECT NOW()) result:', result.rows[0].now);
  });
});


// Basic welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the Community Hub Backend API!');
});


app.use('/api/users', usersRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the backend at: http://localhost:${PORT}`);
});
