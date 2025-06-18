const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error connecting to DB:', err.stack);
  }
  console.log('Successfully connected to PostgreSQL database!');
  client.release();
});

module.exports = pool;