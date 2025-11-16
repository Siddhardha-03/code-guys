// Firebase Authentication Middleware
const { verifyIdToken } = require('../config/firebase-admin');

/**
 * Authentication middleware to verify Firebase ID tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. No token provided.'
      });
    }
    
    const idToken = authHeader.split(' ')[1];
    
    // Verify Firebase ID token
    const decodedToken = await verifyIdToken(idToken);
    
    // Get user from database using firebase_uid
    const [users] = await req.db.execute(
      'SELECT id, firebase_uid, name, email, email_verified, role FROM users WHERE firebase_uid = ?',
      [decodedToken.uid]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found. Please register first.'
      });
    }
    
    const user = users[0];
    
    // Set user info in request object
    req.user = {
      id: user.id,
      firebase_uid: user.firebase_uid,
      name: user.name,
      email: user.email,
      email_verified: Boolean(user.email_verified),
      role: user.role,
      // Also include Firebase token claims if needed
      uid: decodedToken.uid,
      email_verified_firebase: decodedToken.email_verified
    };
    
    next();
  } catch (error) {
    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token. Please login again.'
      });
    }
    
    console.error('Authentication error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed. Please try again.'
    });
  }
};

/**
 * Authorization middleware to check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Admin privileges required.'
    });
  }
};

module.exports = {
  authenticate,
  isAdmin
};