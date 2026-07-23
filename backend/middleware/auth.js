const jwt = require('jsonwebtoken');

// ✅ Sync exact JWT_SECRET fallback with routes/auth.js to guarantee smooth token decoding
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_12345";

/**
 * Authentication Middleware
 * Validates the token sent in the Authorization header and attaches normalized user payload to req.user
 */
const auth = function (req, res, next) {
  // 1. Extract token from standard Authorization header (Bearer <token>)
  const authHeader = req.header('Authorization');
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Fallback: Check custom header 'x-auth-token'
  if (!token) {
    token = req.header('x-auth-token');
  }

  // 2. Reject request immediately if no token exists
  if (!token) {
    return res.status(401).json({ error: true, message: 'No authorization token found. Access denied.' });
  }

  try {
    // 3. Verify JWT token signature
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Normalize user object so both req.user.id AND req.user._id are always available across all routes
    const userId = decoded.id || decoded._id || decoded.userId;
    const userRole = (decoded.role || 'student').toLowerCase();

    req.user = {
      ...decoded,
      id: userId,
      _id: userId,
      role: userRole
    };

    next();
  } catch (err) {
    console.error('Middleware token signature verification failure:', err.message);
    return res.status(401).json({ error: true, message: 'Token verification failed. Please login again.' });
  }
};

/**
 * Faculty Access Middleware
 * Allows entry if the user is either a Faculty member or the Super Admin
 */
const isFaculty = function (req, res, next) {
  if (req.user && req.user.role) {
    const roleLower = req.user.role.toLowerCase();
    if (roleLower === 'faculty' || roleLower === 'admin') {
      return next();
    }
  }
  return res.status(403).json({ error: true, message: 'Access denied. Faculty or Admin authorization required.' });
};

/**
 * Super Admin Only Middleware
 * Restricts entry strictly to System Super Admin
 */
const isAdmin = function (req, res, next) {
  if (req.user && req.user.role && req.user.role.toLowerCase() === 'admin') {
    return next();
  }
  return res.status(403).json({ error: true, message: 'Access denied. Super Admin authorization required.' });
};

module.exports = { auth, isFaculty, isAdmin };
/*
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; // Yeh ab seedhe aapki .env file se secret key uthayega


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


 // Faculty Access Middleware
 
const isFaculty = function (req, res, next) {
  if (req.user && (req.user.role === 'faculty' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Faculty or Admin access only.' });
  }
};


// Super Admin Only Middleware

const isAdmin = function (req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Super Admin access only.' });
  }
};

module.exports = { auth, isFaculty, isAdmin };
*/
