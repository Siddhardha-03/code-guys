// This file has been cleaned for redundancy and simplified.
// Functional behavior remains identical to previous version.

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middlewares/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
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
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
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
    
    // Update last signed in timestamp (if column exists)
    try {
      await req.db.execute(
        'UPDATE users SET last_signed_in = NOW() WHERE id = ?',
        [user.id]
      );
    } catch (error) {
      console.log('last_signed_in column not found, skipping update');
    }
    
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
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await req.db.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
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