import mongoose from 'mongoose';

const callSessionSchema = new mongoose.Schema({
  callId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['ringing', 'answered', 'declined', 'missed', 'ended', 'failed'],
    default: 'ringing'
  },
  sdpOffer: String,
  sdpAnswer: String,
  iceCandidates: [{
    candidate: String,
    sdpMid: String,
    sdpMLineIndex: Number,
    from: {
      type: String,
      enum: ['caller', 'callee']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  startedAt: Date,
  answeredAt: Date,
  endedAt: Date,
  duration: {
    type: Number,
    default: 0 // in seconds
  },
  endReason: {
    type: String,
    enum: ['user_hangup', 'timeout', 'network_error', 'declined']
  },
  quality: {
    avgBitrate: Number,
    packetsLost: Number,
    jitter: Number,
    rtt: Number // Round trip time
  },
  metadata: {
    callerUserAgent: String,
    calleeUserAgent: String,
    connectionType: String,
    serverRegion: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
callSessionSchema.index({ caller: 1, createdAt: -1 });
callSessionSchema.index({ callee: 1, createdAt: -1 });
callSessionSchema.index({ status: 1 });
callSessionSchema.index({ type: 1 });

// Generate unique call ID
callSessionSchema.statics.generateCallId = function() {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get call history for a user
callSessionSchema.statics.getCallHistory = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    $or: [
      { caller: userId },
      { callee: userId }
    ]
  })
  .populate('caller', 'username fullName avatarPath')
  .populate('callee', 'username fullName avatarPath')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Update call status
callSessionSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  
  switch (status) {
    case 'answered':
      this.answeredAt = new Date();
      this.startedAt = new Date();
      break;
    case 'ended':
    case 'declined':
    case 'missed':
    case 'failed':
      this.endedAt = new Date();
      if (this.startedAt) {
        this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
      }
      if (additionalData.endReason) {
        this.endReason = additionalData.endReason;
      }
      break;
  }
  
  // Update quality metrics if provided
  if (additionalData.quality) {
    this.quality = { ...this.quality, ...additionalData.quality };
  }
  
  return this.save();
};

// Add ICE candidate
callSessionSchema.methods.addIceCandidate = function(candidate, from) {
  this.iceCandidates.push({
    ...candidate,
    from,
    addedAt: new Date()
  });
  return this.save();
};

export default mongoose.model('CallSession', callSessionSchema);