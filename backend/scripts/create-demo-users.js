import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Message from '../models/Message.js';
import CallSession from '../models/CallSession.js';

dotenv.config();

const createDemoUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Message.deleteMany({});
    await CallSession.deleteMany({});
    console.log('Cleared existing data');

    // Create demo passwords
    const demoPassword = 'demo123';
    const hashedPassword = await bcrypt.hash(demoPassword, 12);

    // Create users with known passwords
    const user1 = new User({
      _id: new mongoose.Types.ObjectId('6896845e1ad1d718b2346f44'),
      username: 'usuariop7877',
      email: 'test@example.com',
      passwordHash: hashedPassword,
      fullName: 'Usuario Prueba',
      avatarPath: '/uploads/avatars/6896845e1ad1d718b2346f44_1755062002650.jpg',
      status: 'offline',
      lastSeen: new Date('2025-08-13T05:13:48.735Z'),
      contacts: [new mongoose.Types.ObjectId('689684e09f2da01eab54366a')],
      createdAt: new Date('2025-08-08T23:12:30.264Z'),
      updatedAt: new Date('2025-08-13T05:13:48.735Z')
    });

    const user2 = new User({
      _id: new mongoose.Types.ObjectId('689684e09f2da01eab54366a'),
      username: 'robensoni89551',
      email: 'robensoninnocent12@gmail.com',
      passwordHash: hashedPassword,
      fullName: 'Robenson Innocent',
      avatarPath: '/uploads/avatars/689684e09f2da01eab54366a_1756178101894.jpg',
      status: 'offline',
      lastSeen: new Date('2025-08-27T15:13:08.482Z'),
      contacts: [new mongoose.Types.ObjectId('6896845e1ad1d718b2346f44')],
      createdAt: new Date('2025-08-08T23:17:04.000Z'),
      updatedAt: new Date('2025-08-27T15:13:08.482Z')
    });

    const user3 = new User({
      _id: new mongoose.Types.ObjectId('6898918a858b9e892309edd5'),
      username: 'testuser123',
      email: 'testuser@example.com',
      passwordHash: hashedPassword,
      fullName: 'Test User',
      status: 'offline',
      lastSeen: new Date('2025-08-27T02:28:48.597Z'),
      contacts: [new mongoose.Types.ObjectId('689684e09f2da01eab54366a')],
      createdAt: new Date('2025-08-26T18:50:11.000Z'),
      updatedAt: new Date('2025-08-27T02:28:48.597Z')
    });

    // Save users
    await user1.save();
    await user2.save();
    await user3.save();

    console.log('Users created successfully');

    // Create some sample messages between users
    const conversationId1 = Message.createConversationId(user1._id, user2._id);
    const conversationId2 = Message.createConversationId(user2._id, user3._id);

    const sampleMessages = [
      new Message({
        _id: new mongoose.Types.ObjectId(),
        sender: user1._id,
        recipient: user2._id,
        conversationId: conversationId1,
        content: {
          type: 'text',
          text: 'Hola! Como estas?'
        },
        status: 'read',
        createdAt: new Date('2025-08-27T10:00:00.000Z'),
        readAt: new Date('2025-08-27T10:05:00.000Z')
      }),
      new Message({
        _id: new mongoose.Types.ObjectId(),
        sender: user2._id,
        recipient: user1._id,
        conversationId: conversationId1,
        content: {
          type: 'text',
          text: 'Hi! I am doing great, thanks for asking. How about you?'
        },
        status: 'read',
        createdAt: new Date('2025-08-27T10:05:30.000Z'),
        readAt: new Date('2025-08-27T10:06:00.000Z')
      }),
      new Message({
        _id: new mongoose.Types.ObjectId(),
        sender: user1._id,
        recipient: user2._id,
        conversationId: conversationId1,
        content: {
          type: 'text',
          text: 'Todo bien por aqui. Que tal el trabajo?'
        },
        status: 'delivered',
        createdAt: new Date('2025-08-27T10:10:00.000Z'),
        deliveredAt: new Date('2025-08-27T10:10:05.000Z')
      }),
      new Message({
        _id: new mongoose.Types.ObjectId(),
        sender: user2._id,
        recipient: user3._id,
        conversationId: conversationId2,
        content: {
          type: 'text',
          text: 'Welcome to Vigi! This is a test message.'
        },
        status: 'sent',
        createdAt: new Date('2025-08-27T09:00:00.000Z')
      }),
      new Message({
        _id: new mongoose.Types.ObjectId(),
        sender: user3._id,
        recipient: user2._id,
        conversationId: conversationId2,
        content: {
          type: 'text',
          text: 'Thanks! The app looks great. Testing the messaging feature.'
        },
        status: 'read',
        createdAt: new Date('2025-08-27T09:30:00.000Z'),
        readAt: new Date('2025-08-27T09:31:00.000Z')
      })
    ];

    await Message.insertMany(sampleMessages);
    console.log('Sample messages created successfully');

    // Create a sample call session
    const sampleCall = new CallSession({
      callId: 'call_1724759400000_sample123',
      caller: user2._id,
      callee: user1._id,
      type: 'video',
      status: 'ended',
      startedAt: new Date('2025-08-27T08:00:00.000Z'),
      answeredAt: new Date('2025-08-27T08:00:05.000Z'),
      endedAt: new Date('2025-08-27T08:15:30.000Z'),
      duration: 925, // 15 minutes 25 seconds
      endReason: 'user_hangup',
      createdAt: new Date('2025-08-27T08:00:00.000Z')
    });

    await sampleCall.save();
    console.log('Sample call session created successfully');

    console.log('\n=== DEMO USERS CREATED ===');
    console.log('Password for all users: demo123');
    console.log('');
    console.log('Demo Accounts:');
    console.log('1. test@example.com (Usuario Prueba)');
    console.log('2. robensoninnocent12@gmail.com (Robenson Innocent)');
    console.log('3. testuser@example.com (Test User)');
    console.log('');
    console.log('All accounts use password: demo123');
    console.log('You can now login to http://localhost:3000');

  } catch (error) {
    console.error('Error creating demo users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createDemoUsers();