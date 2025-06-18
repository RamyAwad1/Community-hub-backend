const express = require('express');
const router = express.Router();

module.exports = (pool) => {
 
  router.get('/profile', async (req, res) => {
    // req.user.user_id is populated by the authenticateToken middleware
    const user_id = req.user.user_id; 

    if (!user_id) {
      // This should ideally be caught by middleware, but is a good safeguard
      return res.status(401).json({ message: 'Authentication failed: User ID not found in token.' });
    }

    try {
      const client = await pool.connect();
      // Select password_hash is excluded for security
      const result = await client.query(
          `SELECT user_id, email, name, role, created_at, updated_at
           FROM users
           WHERE user_id = $1;`,
          [user_id]
      );
      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User profile not found in database.' });
      }

      res.status(200).json(result.rows[0]); // Return user's DB profile
    } catch (err) {
      console.error('Error in /api/users/profile GET:', err.message);
      res.status(500).json({ message: 'Server error fetching user profile.', error: err.message });
    }
  });

  router.put('/profile', async (req, res) => {
    const { name, email } = req.body;
    const user_id = req.user.user_id; // Get user_id from req.user (populated by middleware)

    if (!user_id) {
      return res.status(401).json({ message: 'Authentication failed: User ID not found in token.' });
    }

    if (!name && !email) {
      return res.status(400).json({ message: 'At least one field (name, email) is required for update.' });
    }

    try {
      const client = await pool.connect();
      let queryParts = [];
      let queryParams = [];
      let paramIndex = 1;

      if (name !== undefined) {
        queryParts.push(`name = $${paramIndex++}`);
        queryParams.push(name);
      }
      if (email !== undefined) {
          // Prevent updating to an email that already exists for another user
          const emailCheck = await client.query('SELECT user_id FROM users WHERE email = $1 AND user_id != $2', [email, user_id]);
          if (emailCheck.rows.length > 0) {
              client.release();
              return res.status(409).json({ message: 'Email already in use by another account.' });
          }
          queryParts.push(`email = $${paramIndex++}`);
          queryParams.push(email);
      }
      
      queryParts.push(`updated_at = NOW()`); // Always update timestamp on profile changes

      const updateQuery = `
        UPDATE users
        SET ${queryParts.join(', ')}
        WHERE user_id = $${paramIndex++}
        RETURNING user_id, email, name, role;
      `;
      queryParams.push(user_id);

      const result = await client.query(updateQuery, queryParams);
      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found or no changes were made.' });
      }

      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Error updating user profile:', err.message);
      if (err.code === '23505') { // PostgreSQL unique violation error code
          return res.status(409).json({ message: 'The provided email is already in use by another user.', error: err.detail });
      }
      res.status(500).json({ message: 'Server error updating profile.', error: err.message });
    }
  });

  return router; // Export the configured router
};
