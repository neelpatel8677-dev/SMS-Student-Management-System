const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; // Yeh ab seedhe aapki .env file se secret key uthayega

/**
 * Authentication Middleware
 * Validates the token sent in the Authorization header and attaches the user payload to the request.
 */
const auth = function (req, res, next) {
  // 1. Extract the token from the standard Authorization header format (Bearer <token>)
  const authHeader = req.header('Authorization');
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Fallback: Check if the token was sent directly in a custom header field
  if (!token) {
    token = req.header('x-auth-token');
  }

  // 2. Reject the request immediately if no token structure exists
  if (!token) {
    return res.status(401).json({ message: 'No authorization token found. Access denied.' });
  }

  try {
    // 3. Decrypt and verify the validation payload footprint
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Mount the structural identity data onto the request pipeline
    req.user = decoded;
    
    next();
  } catch (err) {
    console.error('Middleware token signature verification failure:', err.message);
    res.status(401).json({ message: 'Token execution failed verification. Access denied.' });
  }
};

/**
 * Faculty Access Middleware
 * Allows entry if the user is either a Faculty member or the Super Admin
 */
const isFaculty = function (req, res, next) {
  if (req.user && (req.user.role === 'faculty' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Faculty or Admin access only.' });
  }
};

/**
 * Super Admin Only Middleware
 * Restricts entry strictly to the hardcoded Super Admin
 */
const isAdmin = function (req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Super Admin access only.' });
  }
};

module.exports = { auth, isFaculty, isAdmin };
