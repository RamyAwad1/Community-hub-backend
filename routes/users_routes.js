

const express = require('express');
const router = express.Router(); 
const { Pool } = require('pg'); 

// Initialize PostgreSQL connection pool 
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});




const authenticateUser = (req, res, next) => {
  
  if (!req.user || !req.user.auth0_id) {
    // This is a temporary setup. Actual auth will come from Auth0.
    console.warn("Auth Placeholder: req.user or auth0_id not found. Assuming authenticated for now (DURING DEV ONLY).");
   
  }
  next();
};

// --- API Endpoints for Users ---


router.post('/', async (req, res) => {
  const { auth0_id, email, name } = req.body; 
  let { role } = req.body; // Role can be provided or determined

  // Simple validation
  if (!auth0_id || !email || !name) {
    return res.status(400).json({ message: 'Auth0 ID, email, and name are required.' });
  }

  // Determine role if not explicitly provided (e.g., from an Auth0 rule or default)
  if (!role) {
      if (email === 'admin@example.com') { // Assuming these are special emails for initial role assignment
          role = 'admin';
      } else if (email === 'organizer@example.com') {
          role = 'organizer';
      } else {
          role = 'user'; // Default role for any other email
      }
  }

  try {
    const client = await pool.connect();
    // Attempt to find an existing user by auth0_id
    let userResult = await client.query('SELECT * FROM users WHERE auth0_id = $1', [auth0_id]);

    let user;
    if (userResult.rows.length > 0) {
      // User exists, update their profile (e.g., name, email, role if it changes)
      user = userResult.rows[0];
      const updateQuery = `
        UPDATE users
        SET email = $1, name = $2, role = $3, updated_at = NOW()
        WHERE auth0_id = $4
        RETURNING *;
      `;
      const updatedUserResult = await client.query(updateQuery, [email, name, role, auth0_id]);
      user = updatedUserResult.rows[0];
      console.log(`User updated: ${user.email}, Role: ${user.role}`);
    } else {
      // User does not exist, create a new user
      const insertQuery = `
        INSERT INTO users (auth0_id, email, name, role)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const newUserResult = await client.query(insertQuery, [auth0_id, email, name, role]);
      user = newUserResult.rows[0];
      console.log(`New user created: ${user.email}, Role: ${user.role}`);
    }
    client.release();
    res.status(200).json(user); // Send back the created or updated user object
  } 
  catch (err) {
    console.error('Error in /api/users POST (upsert):', err.message);
  }
});


router.get('/profile', authenticateUser, async (req, res) => {
  // For actual Auth0 integration, req.user will be populated by auth middleware
  const auth0Id = req.user && req.user.auth0_id ? req.user.auth0_id : 'auth0|testuser123'; 

  if (!auth0Id) {
    return res.status(401).json({ message: 'Authentication failed: User ID not found.' });
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT user_id, auth0_id, email, name, role FROM users WHERE auth0_id = $1', [auth0Id]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error in /api/users/profile GET:', err.message);
    res.status(500).json({ message: 'Server error fetching user profile', error: err.message });
  }
});


router.put('/profile', authenticateUser, async (req, res) => {
  const { name, email } = req.body; // Assume user can update name/email
  const auth0Id = req.user && req.user.auth0_id ? req.user.auth0_id : 'auth0|testuser123'; 

  if (!auth0Id) {
    return res.status(401).json({ message: 'Authentication failed: User ID not found.' });
  }

  // Basic validation: At least one field (name or email) must be provided for update
  if (!name && !email) {
    return res.status(400).json({ message: 'At least one field (name, email) is required for update.' });
  }

  try {
    const client = await pool.connect();
    let queryParts = [];
    let queryParams = [];
    let paramIndex = 1;

    if (name !== undefined) { // Check for undefined to allow empty string as a valid update
      queryParts.push(`name = $${paramIndex++}`);
      queryParams.push(name);
    }
    if (email !== undefined) {
      // Check if the new email already exists for another user
      const emailCheck = await client.query('SELECT user_id FROM users WHERE email = $1 AND auth0_id != $2', [email, auth0Id]);
      if (emailCheck.rows.length > 0) {
        client.release();
        return res.status(409).json({ message: 'Email already in use by another account.' });
      }
      queryParts.push(`email = $${paramIndex++}`);
      queryParams.push(email);
    }
    
    // Always update on profile modifications
    queryParts.push(`updated_at = NOW()`);

  
    const updateQuery = `
      UPDATE users
      SET ${queryParts.join(', ')}
      WHERE auth0_id = $${paramIndex++}
      RETURNING user_id, auth0_id, email, name, role;
    `;
    queryParams.push(auth0Id);

    const result = await client.query(updateQuery, queryParams);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found or no changes made.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error in /api/users/profile PUT:', err.message);
  }
});

module.exports = router; 