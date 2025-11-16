// Firebase Authentication Controller
const { verifyIdToken } = require('../config/firebase-admin');

/**
 * Sync Firebase user with local database
 * Called after Firebase authentication on client side
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.syncUser = async (req, res) => {
  try {
    const { firebase_uid, name, email, email_verified } = req.body;
    
    // Validate input
    if (!firebase_uid || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Firebase UID and email are required'
      });
    }
    
    // Check if user exists by firebase_uid
    const [existingUsers] = await req.db.execute(
      'SELECT * FROM users WHERE firebase_uid = ?',
      [firebase_uid]
    );
    
    let user;
    
    if (existingUsers.length > 0) {
      // Update existing user
      user = existingUsers[0];
      
      await req.db.execute(
        'UPDATE users SET name = ?, email = ?, email_verified = ?, last_signed_in = NOW() WHERE firebase_uid = ?',
        [name || user.name, email, email_verified ? 1 : 0, firebase_uid]
      );
      
      // Fetch updated user
      const [updatedUsers] = await req.db.execute(
        'SELECT id, firebase_uid, name, email, email_verified, role, created_at, last_signed_in FROM users WHERE firebase_uid = ?',
        [firebase_uid]
      );
      user = updatedUsers[0];
    } else {
      // Check if email is already used by another user
      const [emailCheck] = await req.db.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (emailCheck.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already registered with a different account'
        });
      }
      
      // Create new user (default role is 'student')
      const [result] = await req.db.execute(
        'INSERT INTO users (firebase_uid, name, email, email_verified, role, last_signed_in) VALUES (?, ?, ?, ?, ?, NOW())',
        [firebase_uid, name, email, email_verified ? 1 : 0, 'student']
      );
      
      // Fetch created user
      const [newUsers] = await req.db.execute(
        'SELECT id, firebase_uid, name, email, email_verified, role, created_at, last_signed_in FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newUsers[0];
    }
    
    res.status(200).json({
      status: 'success',
      message: 'User synced successfully',
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
    console.error('Sync user error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to sync user. Please try again.'
    });
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProfile = async (req, res) => {
  try {
    // Get user from database (to get the most up-to-date info)
    const [users] = await req.db.execute(
      'SELECT id, name, email, role, created_at, last_signed_in FROM users WHERE id = ?',
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
        user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile. Please try again.'
    });
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProfile = async (req, res) => {
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
    
    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const [existingUsers] = await req.db.execute(
        'SELECT * FROM users WHERE email = ? AND id != ?',
        [email, req.user.id]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already taken'
        });
      }
    }
    
    // Update user data
    let updateQuery = 'UPDATE users SET ';
    const updateParams = [];
    
    if (name) {
      updateQuery += 'name = ?, ';
      updateParams.push(name);
    }
    
    if (email) {
      updateQuery += 'email = ?, ';
      updateParams.push(email);
    }
    
    // If changing password
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
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      updateQuery += 'password = ?, ';
      updateParams.push(hashedPassword);
    }
    
    // Remove trailing comma and space
    updateQuery = updateQuery.slice(0, -2);
    
    // Add WHERE clause
    updateQuery += ' WHERE id = ?';
    updateParams.push(req.user.id);
    
    // Execute update query
    await req.db.execute(updateQuery, updateParams);
    
    // Get updated user data
    const [updatedUsers] = await req.db.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUsers[0]
      }
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile. Please try again.'
    });
  }
};