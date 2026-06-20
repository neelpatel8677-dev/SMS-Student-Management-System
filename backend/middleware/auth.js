const jwt = require('jsonwebtoken');

// ✅ AUTH MIDDLEWARE — Har protected route pe lagega
const authMiddleware = (req, res, next) => {
    try {
        // Token header se lo
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }

        const token = authHeader.split(' ')[1];

        // Token verify karo
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // User info request mein daal do (agle middleware/route ke liye)
        req.user = decoded;
        next();

    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token. Please login again." });
    }
};

// ✅ ADMIN ONLY MIDDLEWARE — Sirf admin routes ke liye
const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
};

module.exports = { authMiddleware, adminMiddleware };
