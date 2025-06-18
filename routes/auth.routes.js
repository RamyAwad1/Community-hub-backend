const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (pool) => {
    // Register a new user
    router.post('/register', async (req, res) => {
        const { email, name, password } = req.body; // Role is NOT expected from frontend registration form

        if (!email || !name || !password) return res.status(400).json({ message: 'Email, name, and password are required.' });

        try {
            const client = await pool.connect();
            const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                client.release();
                return res.status(409).json({ message: 'User with that email already exists.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            
            // --- FIX: Determine role based on email if not explicitly provided (which is the case for UI registration) ---
            let userRole = 'user'; // Default role
            if (email === 'admin@example.com') { // Hardcoded admin email for simplicity
                userRole = 'admin';
            } else if (email === 'organizer@example.com') { // Hardcoded organizer email for simplicity
                userRole = 'organizer';
            }
            // --- END FIX ---

            const result = await client.query(
                `INSERT INTO users (email, name, password_hash, role)
                 VALUES ($1, $2, $3, $4)
                 RETURNING user_id, email, name, role, created_at;`,
                [email, name, hashedPassword, userRole]
            );
            client.release();

            const newUser = result.rows[0];
            const token = jwt.sign(
                { user_id: newUser.user_id, role: newUser.role, email: newUser.email, name: newUser.name },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.status(201).json({ message: 'User registered.', user: newUser, token });
        } catch (err) {
            console.error('Error registering user:', err.message);
            res.status(500).json({ message: 'Server error during registration.', error: err.message });
        }
    });

    // Log in a user and return JWT
    router.post('/login', async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

        try {
            const client = await pool.connect();
            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            client.release();

            const user = result.rows[0];
            if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

            const token = jwt.sign(
                { user_id: user.user_id, role: user.role, email: user.email, name: user.name },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            const { password_hash, ...userWithoutHash } = user;
            res.status(200).json({ message: 'Login successful.', user: userWithoutHash, token });
        } catch (err) {
            console.error('Error logging in user:', err.message);
            res.status(500).json({ message: 'Server error during login.', error: err.message });
        }
    });

    return router;
};