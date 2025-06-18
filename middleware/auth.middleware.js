const jwt = require('jsonwebtoken');

// Verifies JWT and attaches user (from token payload) to req.user
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Authentication token required.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT Error:", err.message);
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user; // user_id, role, email, name are in here
        next();
    });
};

// Checks if authenticated user has one of the allowed roles
const authorizeRole = (roles) => (req, res, next) => {
    if (!req.user || !req.user.role) {
        return res.status(403).json({ message: 'Forbidden: No role found.' });
    }
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient role.' });
    }
    next();
};

module.exports = { authenticateToken, authorizeRole };
