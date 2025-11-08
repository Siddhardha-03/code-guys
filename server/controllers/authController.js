// This file has been cleaned for redundancy and simplified.
// Functional behavior remains identical to previous version.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email and password'
      });
    }
    
    // Check if user already exists
    const [existingUsers] = await req.db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user (default role is 'student')
    const [result] = await req.db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'student']
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, name, email, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: result.insertId,
          name,
          email,
          role: 'student'
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed. Please try again.'
    });
  }
};

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }
    
    // Check if user exists
    const [users] = await req.db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    const user = users[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Update last signed in timestamp
    await req.db.execute(
      'UPDATE users SET last_signed_in = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Login failed. Please try again.'
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