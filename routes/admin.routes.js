const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  
    router.get('/events', async (req, res) => {
        try {
            const client = await pool.connect();
            const result = await client.query(
                `SELECT e.*, u.name as organizer_name, u.email as organizer_email
                 FROM events e
                 JOIN users u ON e.organizer_id = u.user_id
                 ORDER BY e.created_at DESC;` // Order by creation date, newest first
            );
            client.release();
            res.status(200).json(result.rows);
        } catch (err) {
            console.error('Error fetching all events for admin:', err.message);
            res.status(500).json({ message: 'Server error fetching all events for admin.' });
        }
    });

    /**
     * @route GET /api/admin/users
     * @desc Get all registered users.
     * Relies on `authenticateToken` and `authorizeRole(['admin'])` middleware in `server.js`.
     * @access Admin only
     */
    router.get('/users', async (req, res) => {
        try {
            const client = await pool.connect();
            // Exclude sensitive password_hash if it were in the users table
            const result = await client.query(
                `SELECT user_id, email, name, role, created_at, updated_at
                 FROM users
                 ORDER BY created_at DESC;`
            );
            client.release();
            res.status(200).json(result.rows);
        } catch (err) {
            console.error('Error fetching all users for admin:', err.message);
            res.status(500).json({ message: 'Server error fetching all users for admin.' });
        }
    });

    // Add other admin-specific routes here (e.g., PUT /api/admin/users/:id to edit user role, DELETE /api/admin/users/:id)

    return router; // Export the configured router
};
