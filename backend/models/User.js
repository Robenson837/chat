import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatarPath: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  statusMessage: {
    type: String,
    maxlength: 200,
    default: ''
  },
  deviceTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['web', 'android', 'ios']
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  lastSeen: {
    type: Date,
    default: Date.now
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  contactRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  settings: {
    notifications: {
      messages: {
        type: Boolean,
        default: true
      },
      calls: {
        type: Boolean,
        default: true
      },
      sound: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      lastSeen: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'contacts'
      },
      profilePhoto: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone'
      },
      status: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'contacts'
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance (username and email already indexed via unique: true)
userSchema.index({ status: 1 });
userSchema.index({ lastSeen: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Get public user data
userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.deviceTokens;
  delete user.contactRequests;
  delete user.blockedUsers;
  delete user.settings;
  return user;
};

// Get safe user data for contacts
userSchema.methods.toContactJSON = function() {
  const user = this.toPublicJSON();
  return {
    _id: user._id,
    username: user.username,
    fullName: user.fullName,
    avatarPath: user.avatarPath,
    status: user.status,
    statusMessage: user.statusMessage,
    lastSeen: user.lastSeen
  };
};

export default mongoose.model('User', userSchema);