import express from 'express';
import { body, query, validationResult } from 'express-validator';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

// Send a message
router.post('/', [
  body('recipientId').isMongoId().withMessage('Valid recipient ID required'),
  body('content.type').isIn(['text', 'media', 'system']).withMessage('Invalid content type'),
  body('content.text').optional().isLength({ min: 1, max: 4000 }).withMessage('Text must be between 1-4000 characters'),
  body('replyTo').optional().isMongoId().withMessage('Valid message ID required for reply')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { recipientId, content, replyTo } = req.body;

    // Check if recipient exists and is not blocked
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Check if sender is blocked by recipient
    if (recipient.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({ error: 'Cannot send message to this user' });
    }

    // Check if recipient is blocked by sender
    const sender = await User.findById(req.user._id);
    if (sender.blockedUsers.includes(recipientId)) {
      return res.status(403).json({ error: 'Cannot send message to blocked user' });
    }

    // Create conversation ID
    const conversationId = Message.createConversationId(req.user._id, recipientId);

    // Validate reply-to message if provided
    if (replyTo) {
      const replyMessage = await Message.findOne({
        _id: replyTo,
        conversationId
      });
      
      if (!replyMessage) {
        return res.status(400).json({ error: 'Reply message not found in this conversation' });
      }
    }

    // Create message
    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      conversationId,
      content,
      replyTo: replyTo || undefined
    });

    await message.save();

    // Populate sender and recipient data
    await message.populate('sender', 'username fullName avatarPath');
    await message.populate('recipient', 'username fullName avatarPath');
    if (replyTo) {
      await message.populate('replyTo');
    }

    // Emit to Socket.io for real-time delivery
    const io = req.app.get('io');
    if (io) {
      // Emit to recipient
      io.to(`user_${recipientId}`).emit('new_message', message);
      
      // Emit to sender (for multi-device sync)
      io.to(`user_${req.user._id}`).emit('message_sent', message);
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    next(error);
  }
});

// Get conversation messages
router.get('/conversation/:userId', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conversationId = Message.createConversationId(req.user._id, userId);
    
    const messages = await Message.getConversationMessages(conversationId, page, limit);
    
    // Get total count for pagination
    const total = await Message.countDocuments({ conversationId });

    // Mark messages as delivered if they're from the other user
    await Message.markAsDelivered(conversationId, req.user._id);

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      conversationId
    });

  } catch (error) {
    next(error);
  }
});

// Mark messages as read
router.patch('/conversation/:userId/read', async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const conversationId = Message.createConversationId(req.user._id, userId);
    
    const result = await Message.markAsRead(conversationId, req.user._id);

    // Emit read receipt to sender
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('messages_read', {
        conversationId,
        readBy: req.user._id,
        readAt: new Date()
      });
    }

    res.json({
      message: 'Messages marked as read',
      count: result.modifiedCount
    });

  } catch (error) {
    next(error);
  }
});

// Get all conversations (chat list)
router.get('/conversations', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get all conversations where user is sender or recipient
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', req.user._id] },
                    { $ne: ['$status', 'read'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.sender',
          foreignField: '_id',
          as: 'lastMessage.sender'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.recipient',
          foreignField: '_id',
          as: 'lastMessage.recipient'
        }
      },
      {
        $unwind: '$lastMessage.sender'
      },
      {
        $unwind: '$lastMessage.recipient'
      }
    ]);

    // Process conversations to get the other user's info
    const processedConversations = conversations.map(conv => {
      const isCurrentUserSender = conv.lastMessage.sender._id.toString() === req.user._id.toString();
      const otherUser = isCurrentUserSender ? conv.lastMessage.recipient : conv.lastMessage.sender;
      
      return {
        conversationId: conv._id,
        otherUser: {
          _id: otherUser._id,
          username: otherUser.username,
          fullName: otherUser.fullName,
          avatarPath: otherUser.avatarPath,
          status: otherUser.status,
          lastSeen: otherUser.lastSeen
        },
        lastMessage: {
          _id: conv.lastMessage._id,
          content: conv.lastMessage.content,
          createdAt: conv.lastMessage.createdAt,
          status: conv.lastMessage.status,
          sender: conv.lastMessage.sender._id
        },
        unreadCount: conv.unreadCount
      };
    });

    res.json({
      conversations: processedConversations,
      pagination: {
        page,
        limit,
        hasMore: conversations.length === limit
      }
    });

  } catch (error) {
    next(error);
  }
});

// Search messages in a conversation
router.get('/conversation/:userId/search', [
  query('q').isLength({ min: 1, max: 100 }).withMessage('Search query is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const conversationId = Message.createConversationId(req.user._id, userId);
    const searchRegex = new RegExp(q, 'i');

    const messages = await Message.find({
      conversationId,
      'content.text': searchRegex
    })
    .populate('sender', 'username fullName avatarPath')
    .populate('recipient', 'username fullName avatarPath')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    const total = await Message.countDocuments({
      conversationId,
      'content.text': searchRegex
    });

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:messageId', async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    // Check if message is older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (message.createdAt < twentyFourHoursAgo) {
      return res.status(403).json({ error: 'Cannot delete messages older than 24 hours' });
    }

    await Message.findByIdAndDelete(messageId);

    // Emit deletion to both users
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${message.recipient}`).emit('message_deleted', {
        messageId,
        conversationId: message.conversationId
      });
      
      io.to(`user_${message.sender}`).emit('message_deleted', {
        messageId,
        conversationId: message.conversationId
      });
    }

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    next(error);
  }
});

// Edit message
router.patch('/:messageId', [
  body('content.text').isLength({ min: 1, max: 4000 }).withMessage('Text must be between 1-4000 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can edit their message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    // Only text messages can be edited
    if (message.content.type !== 'text') {
      return res.status(400).json({ error: 'Only text messages can be edited' });
    }

    // Check if message is older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (message.createdAt < twentyFourHoursAgo) {
      return res.status(403).json({ error: 'Cannot edit messages older than 24 hours' });
    }

    // Update message
    message.edited = {
      isEdited: true,
      editedAt: new Date(),
      originalText: message.content.text
    };
    message.content.text = content.text;

    await message.save();
    await message.populate('sender', 'username fullName avatarPath');
    await message.populate('recipient', 'username fullName avatarPath');

    // Emit edit to both users
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${message.recipient}`).emit('message_edited', message);
      io.to(`user_${message.sender}`).emit('message_edited', message);
    }

    res.json({
      message: 'Message edited successfully',
      data: message
    });

  } catch (error) {
    next(error);
  }
});

export default router;