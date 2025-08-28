import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// Send contact request
router.post('/request', [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('message').optional().isLength({ max: 200 }).withMessage('Message must be less than 200 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId, message } = req.body;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot send contact request to yourself' });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already contacts
    if (req.user.contacts.includes(userId)) {
      return res.status(400).json({ error: 'Already in contacts' });
    }

    // Check if already blocked
    if (req.user.blockedUsers.includes(userId) || targetUser.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({ error: 'Cannot send contact request' });
    }

    // Check if request already exists
    const existingRequest = targetUser.contactRequests.find(
      contactRequest => contactRequest.from && contactRequest.from.toString() === req.user._id.toString()
    );

    if (existingRequest) {
      return res.status(400).json({ error: 'Contact request already sent' });
    }

    // Add contact request to target user
    await User.findByIdAndUpdate(userId, {
      $push: {
        contactRequests: {
          from: req.user._id,
          message: message || '',
          createdAt: new Date()
        }
      }
    });

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('contact_request', {
        from: req.user.toContactJSON(),
        message: message || '',
        createdAt: new Date()
      });
    }

    res.status(201).json({ message: 'Contact request sent successfully' });

  } catch (error) {
    next(error);
  }
});

// Accept contact request
router.post('/accept', [
  body('userId').isMongoId().withMessage('Valid user ID required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.body;

    // Check if contact request exists
    const currentUser = await User.findById(req.user._id);
    const requestIndex = currentUser.contactRequests.findIndex(
      req => req.from && req.from.toString() === userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Contact request not found' });
    }

    // Add to both users' contacts
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { contacts: userId },
      $pull: { contactRequests: { from: userId } }
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { contacts: req.user._id }
    });

    // Get the new contact's info
    const newContact = await User.findById(userId);

    // Emit real-time notifications
    const io = req.app.get('io');
    if (io) {
      // Notify the requester that their request was accepted
      io.to(`user_${userId}`).emit('contact_accepted', {
        user: req.user.toContactJSON(),
        acceptedAt: new Date()
      });

      // Notify current user about the new contact
      io.to(`user_${req.user._id}`).emit('new_contact', {
        user: newContact.toContactJSON(),
        addedAt: new Date()
      });
    }

    res.json({
      message: 'Contact request accepted',
      contact: newContact.toContactJSON()
    });

  } catch (error) {
    next(error);
  }
});

// Decline contact request
router.post('/decline', [
  body('userId').isMongoId().withMessage('Valid user ID required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.body;

    // Remove contact request
    const result = await User.findByIdAndUpdate(req.user._id, {
      $pull: { contactRequests: { from: userId } }
    });

    if (!result) {
      return res.status(404).json({ error: 'Contact request not found' });
    }

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('contact_declined', {
        user: req.user.toContactJSON(),
        declinedAt: new Date()
      });
    }

    res.json({ message: 'Contact request declined' });

  } catch (error) {
    next(error);
  }
});

// Remove contact
router.delete('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot remove yourself from contacts' });
    }

    // Check if user is in contacts
    if (!req.user.contacts.includes(userId)) {
      return res.status(404).json({ error: 'User not in contacts' });
    }

    // Remove from both users' contacts
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { contacts: userId }
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { contacts: req.user._id }
    });

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('contact_removed', {
        user: req.user.toContactJSON(),
        removedAt: new Date()
      });
    }

    res.json({ message: 'Contact removed successfully' });

  } catch (error) {
    next(error);
  }
});

// Get contacts list
router.get('/', async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const user = await User.findById(req.user._id)
      .populate('contacts', 'username fullName avatarPath status statusMessage lastSeen');

    let contacts = user.contacts.map(contact => contact.toContactJSON());

    // Filter by status if provided
    if (status && ['online', 'offline', 'away'].includes(status)) {
      contacts = contacts.filter(contact => contact.status === status);
    }

    // Search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      contacts = contacts.filter(contact => 
        searchRegex.test(contact.username) || 
        searchRegex.test(contact.fullName)
      );
    }

    // Sort by status (online first) then by fullName
    contacts.sort((a, b) => {
      if (a.status === 'online' && b.status !== 'online') return -1;
      if (a.status !== 'online' && b.status === 'online') return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    res.json({
      contacts,
      total: contacts.length
    });

  } catch (error) {
    next(error);
  }
});

// Get contact requests (received)
router.get('/requests', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contactRequests.from', 'username fullName avatarPath status');

    const requests = user.contactRequests
      .filter(request => request.from) // Filter out requests with null/undefined from
      .map(request => ({
        _id: request._id,
        from: request.from.toContactJSON(),
        message: request.message,
        createdAt: request.createdAt
      }));

    // Sort by creation date (newest first)
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      requests,
      total: requests.length
    });

  } catch (error) {
    next(error);
  }
});

// Get sent contact requests
router.get('/requests/sent', async (req, res, next) => {
  try {
    // Find all users who have a contact request from current user
    const usersWithRequests = await User.find({
      'contactRequests.from': req.user._id
    }, {
      'contactRequests.$': 1,
      username: 1,
      fullName: 1,
      avatarPath: 1,
      status: 1
    });

    const sentRequests = usersWithRequests.map(user => {
      const request = user.contactRequests[0];
      return {
        to: user.toContactJSON(),
        message: request.message,
        createdAt: request.createdAt
      };
    });

    // Sort by creation date (newest first)
    sentRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      sentRequests,
      total: sentRequests.length
    });

  } catch (error) {
    next(error);
  }
});

// Cancel sent contact request
router.delete('/requests/sent/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Remove contact request from target user
    const result = await User.findByIdAndUpdate(userId, {
      $pull: { contactRequests: { from: req.user._id } }
    });

    if (!result) {
      return res.status(404).json({ error: 'User not found or request does not exist' });
    }

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('contact_request_cancelled', {
        from: req.user.toContactJSON(),
        cancelledAt: new Date()
      });
    }

    res.json({ message: 'Contact request cancelled successfully' });

  } catch (error) {
    next(error);
  }
});

export default router;