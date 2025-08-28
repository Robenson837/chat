import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName')
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Full name is required and must be less than 100 characters')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Register
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email ? 'Email already exists' : 'Username already exists'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      passwordHash: password, // Will be hashed by pre-save middleware
      fullName
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Return user data without sensitive information
    const userData = user.toPublicJSON();

    res.status(201).json({
      message: 'User created successfully',
      user: userData,
      accessToken,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update user status and last seen
    await User.findByIdAndUpdate(user._id, {
      status: 'online',
      lastSeen: new Date()
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Return user data without sensitive information
    const userData = user.toPublicJSON();

    res.json({
      message: 'Login successful',
      user: userData,
      accessToken,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    res.json({
      message: 'Tokens refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });

  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', async (req, res, next) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just update the user status
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        await User.findByIdAndUpdate(decoded.userId, {
          status: 'offline',
          lastSeen: new Date()
        });
      } catch (error) {
        // Token might be invalid, but that's ok for logout
      }
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
});

// Verify token (for debugging purposes)
router.get('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: user.toPublicJSON()
    });

  } catch (error) {
    res.status(401).json({
      valid: false,
      error: error.message
    });
  }
});

export default router;