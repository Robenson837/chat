import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import CallSession from '../models/CallSession.js';

const connectedUsers = new Map(); // userId -> { socketId, userInfo }
const activeCalls = new Map(); // callId -> { caller, callee, status }

export const initializeSocket = (io) => {
  // Store io instance for access in routes
  io.app = io;

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const user = socket.user;

    console.log(`User connected: ${user.username} (${userId})`);

    // Store connection
    connectedUsers.set(userId, {
      socketId: socket.id,
      userInfo: user.toContactJSON(),
      connectedAt: new Date()
    });

    // Join user to their own room for targeted messaging
    socket.join(`user_${userId}`);

    // Update user status to online
    await User.findByIdAndUpdate(userId, {
      status: 'online',
      lastSeen: new Date()
    });

    // Notify contacts that user is online
    const userWithContacts = await User.findById(userId).populate('contacts');
    userWithContacts.contacts.forEach(contact => {
      socket.to(`user_${contact._id}`).emit('user_status_changed', {
        userId,
        status: 'online',
        lastSeen: new Date()
      });
    });

    // Send online contacts list to newly connected user
    const onlineContacts = [];
    for (const contact of userWithContacts.contacts) {
      if (connectedUsers.has(contact._id.toString())) {
        onlineContacts.push({
          userId: contact._id,
          status: 'online',
          userInfo: contact.toContactJSON()
        });
      }
    }
    
    socket.emit('online_contacts', onlineContacts);

    // Handle typing indicator
    socket.on('typing_start', (data) => {
      const { recipientId, conversationId } = data;
      socket.to(`user_${recipientId}`).emit('user_typing', {
        userId,
        conversationId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { recipientId, conversationId } = data;
      socket.to(`user_${recipientId}`).emit('user_typing', {
        userId,
        conversationId,
        isTyping: false
      });
    });

    // Handle message delivery confirmation
    socket.on('message_delivered', async (data) => {
      const { messageId, conversationId } = data;
      
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { 
            status: 'delivered',
            deliveredAt: new Date()
          },
          { new: true }
        );

        if (message) {
          // Notify sender about delivery
          socket.to(`user_${message.sender}`).emit('message_status_update', {
            messageId,
            status: 'delivered',
            deliveredAt: message.deliveredAt
          });
        }
      } catch (error) {
        console.error('Error updating message delivery status:', error);
      }
    });

    // Handle message read confirmation
    socket.on('message_read', async (data) => {
      const { messageId, conversationId } = data;
      
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { 
            status: 'read',
            readAt: new Date()
          },
          { new: true }
        );

        if (message) {
          // Notify sender about read status
          socket.to(`user_${message.sender}`).emit('message_status_update', {
            messageId,
            status: 'read',
            readAt: message.readAt
          });
        }
      } catch (error) {
        console.error('Error updating message read status:', error);
      }
    });

    // WebRTC Call Signaling
    socket.on('call_initiate', async (data) => {
      const { calleeId, type } = data; // type: 'voice' or 'video'
      
      try {
        // Check if callee is online
        if (!connectedUsers.has(calleeId)) {
          socket.emit('call_error', { error: 'User is offline' });
          return;
        }

        // Check if users are contacts
        if (!user.contacts.includes(calleeId)) {
          socket.emit('call_error', { error: 'Can only call contacts' });
          return;
        }

        // Check if there's already an active call
        const existingCall = Array.from(activeCalls.values()).find(
          call => (call.caller === userId || call.callee === userId || 
                   call.caller === calleeId || call.callee === calleeId) &&
                  ['ringing', 'answered'].includes(call.status)
        );

        if (existingCall) {
          socket.emit('call_error', { error: 'User is already in a call' });
          return;
        }

        // Create call session
        const callId = CallSession.generateCallId();
        const callSession = new CallSession({
          callId,
          caller: userId,
          callee: calleeId,
          type,
          status: 'ringing'
        });

        await callSession.save();

        // Store in active calls
        activeCalls.set(callId, {
          caller: userId,
          callee: calleeId,
          type,
          status: 'ringing',
          createdAt: new Date()
        });

        // Notify caller
        socket.emit('call_initiated', {
          callId,
          callee: calleeId,
          type,
          status: 'ringing'
        });

        // Notify callee
        socket.to(`user_${calleeId}`).emit('incoming_call', {
          callId,
          caller: user.toContactJSON(),
          type,
          createdAt: new Date()
        });

        // Set timeout for missed call
        setTimeout(async () => {
          const call = activeCalls.get(callId);
          if (call && call.status === 'ringing') {
            await endCall(callId, 'missed', io);
          }
        }, 30000); // 30 second timeout

      } catch (error) {
        console.error('Error initiating call:', error);
        socket.emit('call_error', { error: 'Failed to initiate call' });
      }
    });

    socket.on('call_answer', async (data) => {
      const { callId } = data;
      
      try {
        const call = activeCalls.get(callId);
        if (!call || call.status !== 'ringing') {
          socket.emit('call_error', { error: 'Call not found or already answered' });
          return;
        }

        // Update call status
        call.status = 'answered';
        activeCalls.set(callId, call);

        await CallSession.findOne({ callId }).then(session => {
          if (session) {
            session.updateStatus('answered');
          }
        });

        // Notify both parties
        socket.emit('call_answered', { callId });
        socket.to(`user_${call.caller}`).emit('call_answered', { callId });

      } catch (error) {
        console.error('Error answering call:', error);
        socket.emit('call_error', { error: 'Failed to answer call' });
      }
    });

    socket.on('call_decline', async (data) => {
      const { callId } = data;
      await endCall(callId, 'declined', io, userId);
    });

    socket.on('call_end', async (data) => {
      const { callId } = data;
      await endCall(callId, 'user_hangup', io, userId);
    });

    // WebRTC signaling
    socket.on('webrtc_offer', (data) => {
      const { callId, offer, to } = data;
      socket.to(`user_${to}`).emit('webrtc_offer', {
        callId,
        offer,
        from: userId
      });
    });

    socket.on('webrtc_answer', (data) => {
      const { callId, answer, to } = data;
      socket.to(`user_${to}`).emit('webrtc_answer', {
        callId,
        answer,
        from: userId
      });
    });

    socket.on('webrtc_ice_candidate', (data) => {
      const { callId, candidate, to } = data;
      socket.to(`user_${to}`).emit('webrtc_ice_candidate', {
        callId,
        candidate,
        from: userId
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${user.username} (${userId})`);
      
      // Remove from connected users
      connectedUsers.delete(userId);

      // Update user status to offline
      await User.findByIdAndUpdate(userId, {
        status: 'offline',
        lastSeen: new Date()
      });

      // Notify contacts that user is offline
      userWithContacts.contacts.forEach(contact => {
        socket.to(`user_${contact._id}`).emit('user_status_changed', {
          userId,
          status: 'offline',
          lastSeen: new Date()
        });
      });

      // End any active calls
      const userCalls = Array.from(activeCalls.entries()).filter(
        ([callId, call]) => call.caller === userId || call.callee === userId
      );

      for (const [callId] of userCalls) {
        await endCall(callId, 'user_hangup', io, userId);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

// Helper function to end calls
async function endCall(callId, reason, io, initiatedBy = null) {
  try {
    const call = activeCalls.get(callId);
    if (!call) return;

    // Update call status
    call.status = reason;
    call.endedAt = new Date();

    // Update database
    const callSession = await CallSession.findOne({ callId });
    if (callSession) {
      // Map status to valid endReason values
      let endReason;
      switch (reason) {
        case 'user_hangup':
          endReason = 'user_hangup';
          break;
        case 'declined':
          endReason = 'declined';
          break;
        case 'timeout':
          endReason = 'timeout';
          break;
        case 'network_error':
          endReason = 'network_error';
          break;
        default:
          endReason = 'user_hangup'; // Default fallback
      }
      
      await callSession.updateStatus('ended', { endReason });
    }

    // Notify both parties
    io.to(`user_${call.caller}`).emit('call_ended', {
      callId,
      reason,
      endedBy: initiatedBy,
      duration: callSession?.duration || 0
    });

    io.to(`user_${call.callee}`).emit('call_ended', {
      callId,
      reason,
      endedBy: initiatedBy,
      duration: callSession?.duration || 0
    });

    // Remove from active calls
    activeCalls.delete(callId);

  } catch (error) {
    console.error('Error ending call:', error);
  }
}

export { connectedUsers, activeCalls };