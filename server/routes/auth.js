// Firebase Authentication Routes
const express = require('express');
const router = express.Router();
const { syncUser } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

/**
 * @route   POST /api/auth/sync
 * @desc    Sync Firebase user with local database
 * @access  Public (Firebase token verified in controller)
 */
router.post('/sync', syncUser);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await req.db.execute(
      'SELECT id, firebase_uid, name, email, email_verified, role, created_at, last_signed_in FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const user = users[0];
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          firebase_uid: user.firebase_uid,
          name: user.name,
          email: user.email,
          email_verified: Boolean(user.email_verified),
          role: user.role,
          created_at: user.created_at,
          last_signed_in: user.last_signed_in
        }
      }
    });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile. Please try again.'
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get detailed user profile with last signed in
 * @access  Private
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    let users;
    try {
      // Try with last_signed_in column
      [users] = await req.db.execute(
        'SELECT id, name, email, role, created_at, last_signed_in FROM users WHERE id = ?',
        [req.user.id]
      );
    } catch (error) {
      console.log('last_signed_in column not found, using fallback query');
      // Fallback without last_signed_in column
      [users] = await req.db.execute(
        'SELECT id, name, email, role, created_at, NULL as last_signed_in FROM users WHERE id = ?',
        [req.user.id]
      );
    }
    
    if (users.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile. Please try again.'
    });
  }
});

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/update-profile', authenticate, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    
    // Get current user data
    const [users] = await req.db.execute(
      'SELECT * FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const user = users[0];
    let hashedPassword = user.password;
    
    // If user wants to change password
    if (currentPassword && newPassword) {
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Current password is incorrect'
        });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(newPassword, salt);
    }
    
    // Update user
    await req.db.execute(
      'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
      [name || user.name, email || user.email, hashedPassword, req.user.id]
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          name: name || user.name,
          email: email || user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile. Please try again.'
    });
  }
});

module.exports = router;