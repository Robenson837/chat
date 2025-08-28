// MongoDB initialization script
db = db.getSiblingDB('vigichat_db');

// Create collections
db.createCollection('users');
db.createCollection('messages');
db.createCollection('callsessions');
db.createCollection('sessions');
db.createCollection('blockhistories');
db.createCollection('conversations');

// Create indexes for better performance

// Users indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "status": 1 });
db.users.createIndex({ "lastSeen": -1 });
db.users.createIndex({ "contacts": 1 });

// Messages indexes
db.messages.createIndex({ "conversationId": 1, "createdAt": -1 });
db.messages.createIndex({ "sender": 1, "recipient": 1, "createdAt": -1 });
db.messages.createIndex({ "status": 1 });
db.messages.createIndex({ "content.text": "text" });

// Call sessions indexes
db.callsessions.createIndex({ "caller": 1, "createdAt": -1 });
db.callsessions.createIndex({ "callee": 1, "createdAt": -1 });
db.callsessions.createIndex({ "status": 1 });
db.callsessions.createIndex({ "type": 1 });
db.callsessions.createIndex({ "callId": 1 }, { unique: true });

// Sessions indexes (for JWT blacklisting if needed)
db.sessions.createIndex({ "userId": 1 });
db.sessions.createIndex({ "sessionToken": 1 }, { unique: true });
db.sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

print('Database and indexes created successfully!');
print('Collections:', db.getCollectionNames());