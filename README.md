# Vigi - Modern Messaging App with Voice & Video Calls

Vigi is a modern, secure messaging application built with Node.js, Express, MongoDB, React, and WebRTC. It features real-time messaging, voice/video calls, contact management, and a clean, responsive interface.

## Features

### Core Features
- **Real-time Messaging**: Instant text messaging with Socket.io
- **Voice & Video Calls**: WebRTC-powered audio and video calling
- **Contact Management**: Add, manage, and organize contacts
- **User Authentication**: JWT-based secure authentication
- **File Sharing**: Upload and share images, documents, and media
- **Message Status**: Sent, delivered, and read receipts
- **Online Presence**: See when contacts are online/offline
- **Typing Indicators**: Real-time typing notifications

### Technical Features
- **Responsive Design**: Mobile-first responsive UI
- **WebRTC Signaling**: Peer-to-peer connection establishment
- **TURN/STUN Support**: NAT traversal for reliable connections
- **Docker Support**: Containerized deployment
- **MongoDB**: Scalable document database
- **Redis Support**: For horizontal scaling (optional)

## Tech Stack

### Backend
- **Node.js** (LTS) - Runtime environment
- **Express.js** - Web framework
- **MongoDB** with **Mongoose** - Database
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Query** - Server state management
- **Socket.io-client** - Real-time client
- **WebRTC APIs** - Voice/video calling

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy and static file serving
- **COTURN** - TURN server for WebRTC
- **Redis** - Caching and session storage (optional)

## Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd Chat
```

### 2. Environment Setup

Copy the environment file and configure:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:
```env
# Database - Using provided MongoDB Atlas instance
MONGO_URI=mongodb+srv://vigichat_user:Vigichat4312@cluster0.hpbyvvb.mongodb.net/vigichat_db?retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# WebRTC TURN/STUN Configuration
STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
TURN_HOST=localhost
TURN_PORT=3478
TURN_USER=vigiturn
TURN_PASS=vigisecret123
```

### 3. Run with Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- **Aplicación Completa**: http://localhost:3000 ✨
- **Backend API**: http://localhost:3001  
- **Frontend Dev**: http://localhost:5173
- **MongoDB**: localhost:27017
- **COTURN**: localhost:3478

### 4. Run for Development

#### Opción 1: Todo en Puerto 3000 (Recomendado)
```bash
# Instalar dependencias
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# Arrancar todo el sistema en puerto 3000
npm run dev
```

#### Opción 2: Servicios Separados
```bash
# Backend en puerto 3001
cd backend
npm run dev

# Frontend en puerto 5173
cd frontend  
npm run dev
```

#### Opción 3: Usando el Script de Desarrollo
```bash
node start-dev.js
```

### 5. Seed Database

Populate the database with sample data:
```bash
# Using Docker
docker-compose exec backend npm run seed

# Local development
cd backend
npm run seed
```

## Sample User Accounts

After seeding, you can login with:

**Password for all accounts: `demo123`**

1. **Usuario Prueba**
   - Email: `test@example.com`
   - Password: `demo123`

2. **Robenson Innocent** 
   - Email: `robensoninnocent12@gmail.com`
   - Password: `demo123`

3. **Test User**
   - Email: `testuser@example.com`
   - Password: `demo123`

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token validity

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile
- `GET /api/users/search` - Search users
- `GET /api/users/:userId` - Get user by ID

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/conversation/:userId` - Get conversation messages
- `GET /api/messages/conversations` - Get all conversations
- `PATCH /api/messages/conversation/:userId/read` - Mark messages as read

### Contacts
- `GET /api/contacts` - Get contacts list
- `POST /api/contacts/request` - Send contact request
- `POST /api/contacts/accept` - Accept contact request
- `DELETE /api/contacts/:userId` - Remove contact

### File Upload
- `POST /api/upload/avatar` - Upload user avatar
- `POST /api/upload/attachments` - Upload message attachments

## WebRTC & Calling

### STUN/TURN Configuration

The app supports both STUN and TURN servers for reliable WebRTC connections:

#### Using Public STUN Servers
```env
STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
```

#### Using COTURN (Included in Docker Compose)
```env
TURN_HOST=localhost  # or your server IP
TURN_PORT=3478
TURN_USER=vigiturn
TURN_PASS=vigisecret123
```

#### Production TURN Setup
For production, configure COTURN with:
1. SSL/TLS certificates
2. Proper firewall rules (UDP ports 49152-65535)
3. Strong authentication credentials
4. Rate limiting and monitoring

### WebRTC Flow

1. **Call Initiation**: Caller requests getUserMedia and creates offer
2. **Signaling**: Offer/answer and ICE candidates exchanged via Socket.io
3. **Connection**: Peer-to-peer connection established
4. **Media Streaming**: Audio/video streams shared directly between peers
5. **TURN Fallback**: If P2P fails, traffic relayed through TURN server

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests  
```bash
cd frontend
npm test
```

### Manual Testing Checklist

#### Authentication
- [ ] User registration with validation
- [ ] Login with correct/incorrect credentials  
- [ ] Token refresh functionality
- [ ] Logout clears authentication

#### Messaging
- [ ] Send/receive text messages
- [ ] File attachment upload/download
- [ ] Message status indicators (sent/delivered/read)
- [ ] Typing indicators
- [ ] Message search

#### Contacts
- [ ] Send contact requests
- [ ] Accept/decline requests
- [ ] Remove contacts
- [ ] Block/unblock users

#### Calling
- [ ] Initiate voice calls
- [ ] Initiate video calls
- [ ] Accept/decline calls
- [ ] Mute/unmute audio
- [ ] Enable/disable video
- [ ] Call statistics display

#### Real-time Features
- [ ] Online/offline status updates
- [ ] Message delivery in real-time
- [ ] Call notifications
- [ ] Reconnection after network issues

## Production Deployment

### Environment Variables

Set production-appropriate values:

```env
NODE_ENV=production
JWT_SECRET=your-very-secure-production-secret
MONGO_URI=your-production-mongodb-uri
CLIENT_URL=https://your-domain.com
TURN_HOST=your-turn-server.com
```

### Security Considerations

1. **HTTPS**: Use SSL certificates for all communication
2. **Database**: Secure MongoDB with authentication and network restrictions
3. **JWT**: Use strong secrets and appropriate expiration times
4. **TURN**: Secure COTURN with credentials and rate limiting
5. **Files**: Validate uploads and scan for malware
6. **Rate Limiting**: Configure appropriate request limits

### Scaling

#### Horizontal Scaling
- Use Redis adapter for Socket.io clustering
- Load balance with sticky sessions
- Separate media servers for file storage

#### Database Optimization
- Index frequently queried fields
- Implement database sharding for large datasets
- Use read replicas for query distribution

## Architecture

### System Architecture
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │  Database   │
│   (React)   │◄──►│ (Node.js)   │◄──►│ (MongoDB)   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   
       │            ┌─────────────┐            
       │            │   Socket.io │            
       └────────────┤   (WebSocket)│            
                    └─────────────┘            
                           │                   
                    ┌─────────────┐            
                    │   COTURN    │            
                    │ (TURN/STUN) │            
                    └─────────────┘            
```

### Database Schema

#### Users Collection
```javascript
{
  username: String,
  email: String,
  passwordHash: String,
  fullName: String,
  avatarPath: String,
  status: 'online' | 'offline' | 'away',
  contacts: [ObjectId],
  // ... additional fields
}
```

#### Messages Collection
```javascript
{
  sender: ObjectId,
  recipient: ObjectId,
  conversationId: String,
  content: {
    type: 'text' | 'media' | 'system',
    text: String
  },
  status: 'sent' | 'delivered' | 'read',
  // ... timestamps and metadata
}
```

#### Call Sessions Collection
```javascript
{
  callId: String,
  caller: ObjectId,
  callee: ObjectId,
  type: 'voice' | 'video',
  status: 'ringing' | 'answered' | 'ended',
  duration: Number,
  // ... call metadata
}
```

## Security & Privacy

### Current Security Measures
- Password hashing with bcrypt (12 rounds)
- JWT access/refresh token pattern
- Request rate limiting
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- File upload validation

### Privacy Considerations
- No end-to-end encryption (transport-level only)
- Message history stored in database
- Call metadata logged for debugging
- File uploads stored on server

### E2EE Roadmap (Future)
To implement true end-to-end encryption like Signal:

1. **Key Exchange**: Implement Double Ratchet algorithm
2. **Message Encryption**: Encrypt messages client-side before sending
3. **Perfect Forward Secrecy**: Rotate keys regularly
4. **Identity Verification**: Add safety numbers/fingerprints
5. **Zero-Knowledge**: Minimize server-side data storage

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request

## Troubleshooting

### Common Issues

#### Connection Problems
- Check MongoDB connection string
- Verify JWT secrets are set
- Ensure ports are not blocked by firewall

#### WebRTC Call Issues  
- Check camera/microphone permissions
- Verify STUN/TURN server configuration
- Test with TURN server for NAT traversal

#### File Upload Problems
- Check upload directory permissions
- Verify file size limits
- Ensure proper MIME type handling

#### Socket.io Connection Issues
- Check CORS configuration
- Verify WebSocket support
- Test connection without proxy/VPN

### Logs and Debugging

#### View Container Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
```

#### Enable Debug Mode
```bash
# Backend
DEBUG=socket.io* npm run dev

# Frontend  
VITE_DEBUG=1 npm run dev
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern web technologies
- Inspired by popular messaging applications
- WebRTC implementation follows standard practices
- Security follows OWASP guidelines

---

## Contact

For questions or support, please open an issue on GitHub.

**Version**: 1.0.0  
**Last Updated**: August 2025