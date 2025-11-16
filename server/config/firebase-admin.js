const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// For development, using project ID and credentials from environment
// In production, use service account JSON file
admin.initializeApp({
  projectId: 'code-guy',
  // If you have a service account key, uncomment and use:
  // credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

const auth = admin.auth();

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<admin.auth.DecodedIdToken>} Decoded token with user info
 */
const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = {
  admin,
  auth,
  verifyIdToken
};
