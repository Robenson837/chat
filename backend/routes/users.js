import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// Get current user profile
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch('/me', [
  body('fullName').optional().isLength({ min: 1, max: 100 }).trim(),
  body('statusMessage').optional().isLength({ max: 200 }).trim(),
  body('status').optional().isIn(['online', 'offline', 'away']),
  body('settings.notifications.messages').optional().isBoolean(),
  body('settings.notifications.calls').optional().isBoolean(),
  body('settings.notifications.sound').optional().isBoolean(),
  body('settings.privacy.lastSeen').optional().isIn(['everyone', 'contacts', 'nobody']),
  body('settings.privacy.profilePhoto').optional().isIn(['everyone', 'contacts', 'nobody']),
  body('settings.privacy.status').optional().isIn(['everyone', 'contacts', 'nobody'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const updates = {};
    const allowedUpdates = [
      'fullName', 
      'statusMessage', 
      'status',
      'settings'
    ];

    // Build update object
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'settings') {
          // Handle nested settings updates
          Object.keys(req.body.settings || {}).forEach(settingCategory => {
            if (req.body.settings[settingCategory]) {
              Object.keys(req.body.settings[settingCategory]).forEach(setting => {
                updates[`settings.${settingCategory}.${setting}`] = req.body.settings[settingCategory][setting];
              });
            }
          });
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    if (updates.status) {
      updates.lastSeen = new Date();
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.json({
      message: 'Profile updated successfully',
      user: user.toPublicJSON()
    });

  } catch (error) {
    next(error);
  }
});

// Search users
router.get('/search', async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      $and: [
        {
          $or: [
            { username: searchRegex },
            { fullName: searchRegex },
            { email: searchRegex }
          ]
        },
        { _id: { $ne: req.user._id } } // Exclude current user
      ]
    })
    .select('username fullName avatarPath status lastSeen')
    .limit(parseInt(limit))
    .skip(skip);

    const total = await User.countDocuments({
      $and: [
        {
          $or: [
            { username: searchRegex },
            { fullName: searchRegex },
            { email: searchRegex }
          ]
        },
        { _id: { $ne: req.user._id } }
      ]
    });

    res.json({
      users: users.map(user => user.toContactJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get user by ID (for contact info)
router.get('/:userId', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username fullName avatarPath status statusMessage lastSeen');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy settings
    const isContact = req.user.contacts.includes(user._id);
    const userPublicData = user.toContactJSON();

    // Apply privacy settings
    if (user.settings?.privacy?.lastSeen === 'nobody' || 
        (user.settings?.privacy?.lastSeen === 'contacts' && !isContact)) {
      delete userPublicData.lastSeen;
    }

    if (user.settings?.privacy?.status === 'nobody' || 
        (user.settings?.privacy?.status === 'contacts' && !isContact)) {
      delete userPublicData.statusMessage;
    }

    if (user.settings?.privacy?.profilePhoto === 'nobody' || 
        (user.settings?.privacy?.profilePhoto === 'contacts' && !isContact)) {
      delete userPublicData.avatarPath;
    }

    res.json({ user: userPublicData });

  } catch (error) {
    next(error);
  }
});

// Block/unblock user
router.patch('/:userId/block', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'block' or 'unblock'

    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "block" or "unblock"' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const update = action === 'block' 
      ? { $addToSet: { blockedUsers: userId } }
      : { $pull: { blockedUsers: userId } };

    await User.findByIdAndUpdate(req.user._id, update);

    // If blocking, also remove from contacts
    if (action === 'block') {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { contacts: userId }
      });
      await User.findByIdAndUpdate(userId, {
        $pull: { contacts: req.user._id }
      });
    }

    res.json({ 
      message: `User ${action}ed successfully`,
      action,
      userId 
    });

  } catch (error) {
    next(error);
  }
});

// Get blocked users list
router.get('/blocked/list', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'username fullName avatarPath');

    res.json({ 
      blockedUsers: user.blockedUsers.map(u => u.toContactJSON())
    });

  } catch (error) {
    next(error);
  }
});

export default router;