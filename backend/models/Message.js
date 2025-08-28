import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: {
      type: String,
      enum: ['text', 'media', 'system'],
      required: true
    },
    text: {
      type: String,
      maxlength: 4000
    },
    mediaType: {
      type: String,
      enum: ['image', 'audio', 'video', 'document']
    },
    fileName: String,
    fileSize: Number,
    duration: Number // for audio/video in seconds
  },
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    originalName: String,
    filePath: {
      type: String,
      required: true
    },
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  deliveredAt: Date,
  readAt: Date,
  edited: {
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    originalText: String
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({ 'content.text': 'text' });

// Create conversation ID from two user IDs
messageSchema.statics.createConversationId = function(userId1, userId2) {
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  return sortedIds.join('_');
};

// Get messages for a conversation with pagination
messageSchema.statics.getConversationMessages = function(conversationId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({ conversationId })
    .populate('sender', 'username fullName avatarPath')
    .populate('recipient', 'username fullName avatarPath')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Mark messages as delivered
messageSchema.statics.markAsDelivered = function(conversationId, recipientId) {
  return this.updateMany(
    {
      conversationId,
      recipient: recipientId,
      status: 'sent'
    },
    {
      status: 'delivered',
      deliveredAt: new Date()
    }
  );
};

// Mark messages as read
messageSchema.statics.markAsRead = function(conversationId, recipientId) {
  return this.updateMany(
    {
      conversationId,
      recipient: recipientId,
      status: { $in: ['sent', 'delivered'] }
    },
    {
      status: 'read',
      readAt: new Date()
    }
  );
};

export default mongoose.model('Message', messageSchema);