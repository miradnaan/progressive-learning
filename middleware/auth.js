const jwt = require('jsonwebtoken');

// Warn at startup if JWT_SECRET is missing
if (!process.env.JWT_SECRET) {
  console.warn('\n⚠️  WARNING: JWT_SECRET is not set in environment variables.');
  console.warn('   Authentication will fail. Set JWT_SECRET in your .env file.\n');
}

function extractToken(req) {
  const authHeader = req.headers.authorization || req.header?.('Authorization');
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return authHeader.trim();
}

/**
 * Authentication middleware: verifies Bearer token in Authorization header.
 * Sets req.user = { id, email, role }. Returns 401 if invalid or missing.
 */
function auth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    const decoded = jwt.verify(token, secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Optional authentication middleware: sets req.user if token is valid,
 * or sets req.user = null and proceeds if token is missing/invalid.
 */
function optional(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
  } catch (err) {
    req.user = null;
  }
  next();
}

/**
 * Role-based authorization middleware: restricts access to instructors.
 * Returns 403 if user is not an instructor.
 */
function instructorOnly(req, res, next) {
  if (!req.user || req.user.role !== 'instructor') {
    return res.status(403).json({ error: 'Access denied: Instructor only.' });
  }
  next();
}

auth.auth = auth;
auth.optional = optional;
auth.instructorOnly = instructorOnly;

module.exports = auth;
module.exports.auth = auth;
module.exports.optional = optional;
module.exports.instructorOnly = instructorOnly;
