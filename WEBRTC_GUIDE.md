# WebRTC Implementation Guide for Vigi

## Overview

Vigi implements WebRTC for peer-to-peer voice and video calling with Socket.io signaling and TURN fallback support. This document explains the implementation details, flow, and configuration.

## WebRTC Flow in Vigi

### 1. Call Initiation
```
Caller                    Server (Socket.io)           Callee
  │                             │                        │
  │──── call_initiate ─────────►│                        │
  │                             │──── incoming_call ────►│
  │◄─── call_initiated ────────│                        │
  │                             │                        │
```

### 2. Call Answer & Signaling
```
Caller                    Server (Socket.io)           Callee
  │                             │                        │
  │                             │◄─── call_answer ──────│
  │◄─── call_answered ─────────│                        │
  │                             │──── call_answered ────►│
  │                             │                        │
  │──── webrtc_offer ──────────►│──── webrtc_offer ─────►│
  │                             │                        │
  │◄─── webrtc_answer ─────────│◄─── webrtc_answer ────│
  │                             │                        │
  │──── ice_candidates ────────►│──── ice_candidates ───►│
  │◄─── ice_candidates ────────│◄─── ice_candidates ────│
```

### 3. Direct P2P Connection
```
Caller ◄────── Direct WebRTC Connection ──────► Callee
       (Audio/Video streams flow directly)
```

## Implementation Components

### 1. WebRTC Service (`frontend/src/services/webrtc.js`)

Main service handling WebRTC peer connections:

```javascript
class WebRTCService {
  // Core methods
  initiateCall(calleeId, type)    // Start a call
  answerCall(callId, callerId)    // Answer incoming call
  createPeerConnection()          // Setup RTCPeerConnection
  handleOffer(data)              // Process WebRTC offer
  handleAnswer(data)             // Process WebRTC answer
  handleIceCandidate(data)       // Handle ICE candidates
  
  // Media controls
  toggleMute()                   // Mute/unmute audio
  toggleVideo()                  // Enable/disable video
  switchCamera()                 // Switch front/back camera
  
  // Cleanup
  endCall()                      // End call and cleanup
  cleanup()                      // Clean WebRTC resources
}
```

### 2. Socket.io Signaling (`backend/socket/socketHandler.js`)

Server-side signaling for WebRTC:

```javascript
// Call events
socket.on('call_initiate', (data) => {
  // Validate users, check availability
  // Create call session in database
  // Emit to callee
})

socket.on('call_answer', (data) => {
  // Update call status
  // Notify both parties
})

// WebRTC signaling
socket.on('webrtc_offer', (data) => {
  socket.to(`user_${to}`).emit('webrtc_offer', data)
})

socket.on('webrtc_answer', (data) => {
  socket.to(`user_${to}`).emit('webrtc_answer', data)
})

socket.on('webrtc_ice_candidate', (data) => {
  socket.to(`user_${to}`).emit('webrtc_ice_candidate', data)
})
```

### 3. Call Store (`frontend/src/store/callStore.js`)

Zustand store for call state management:

```javascript
const useCallStore = create((set, get) => ({
  // Call state
  isInCall: false,
  callId: null,
  callType: 'voice' | 'video',
  callStatus: 'ringing' | 'connecting' | 'connected',
  
  // Media streams
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  
  // Controls
  isMuted: false,
  isVideoEnabled: true,
  
  // Actions
  startCall, answerCall, endCall,
  toggleMute, toggleVideo,
  // ... other actions
}))
```

## STUN/TURN Configuration

### STUN Servers (NAT Discovery)
Used for discovering public IP addresses behind NAT:

```javascript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

### TURN Servers (Relay Traffic)
Used when direct P2P connection fails:

```javascript
const configuration = {
  iceServers: [
    // STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    
    // TURN server
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'vigiturn',
      credential: 'vigisecret123'
    }
  ]
}
```

### COTURN Setup (Docker)

Included in `docker-compose.yml`:

```yaml
coturn:
  image: coturn/coturn:4.6.2
  ports:
    - "3478:3478"
    - "3478:3478/udp"
    - "49152-65535:49152-65535/udp"
  command: >
    turnserver
    --listening-port=3478
    --min-port=49152
    --max-port=65535
    --user=vigiturn:vigisecret123
    --realm=vigi.local
```

## Call Flow Detailed

### 1. Call Initiation (Caller)
1. User clicks call button
2. `webRTCService.initiateCall()` called
3. Request `getUserMedia()` for local stream
4. Create `RTCPeerConnection`
5. Add local stream tracks
6. Send `call_initiate` via Socket.io
7. Wait for callee response

### 2. Incoming Call (Callee)
1. Receive `incoming_call` event
2. Show call notification UI
3. User can accept or decline
4. If accept: get `getUserMedia()` and create peer connection

### 3. WebRTC Negotiation
1. **Caller creates offer**:
   ```javascript
   const offer = await pc.createOffer()
   await pc.setLocalDescription(offer)
   socket.emit('webrtc_offer', { offer, to: calleeId })
   ```

2. **Callee handles offer**:
   ```javascript
   await pc.setRemoteDescription(offer)
   const answer = await pc.createAnswer()
   await pc.setLocalDescription(answer)
   socket.emit('webrtc_answer', { answer, to: callerId })
   ```

3. **Caller handles answer**:
   ```javascript
   await pc.setRemoteDescription(answer)
   ```

4. **ICE candidates exchanged**:
   ```javascript
   pc.onicecandidate = (event) => {
     if (event.candidate) {
       socket.emit('webrtc_ice_candidate', {
         candidate: event.candidate,
         to: remoteUserId
       })
     }
   }
   ```

### 4. Media Streaming
1. `pc.ontrack` receives remote stream
2. Attach streams to video elements
3. Direct P2P media flow established
4. Call UI shows connected state

### 5. Call End
1. User clicks end call
2. `pc.close()` closes peer connection
3. Stop all media tracks
4. Clean up resources
5. Notify other party via Socket.io

## Media Controls Implementation

### Audio Mute/Unmute
```javascript
toggleMute() {
  const audioTrack = this.localStream.getAudioTracks()[0]
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled
    return !audioTrack.enabled // Return muted state
  }
}
```

### Video Enable/Disable
```javascript
toggleVideo() {
  const videoTrack = this.localStream.getVideoTracks()[0]
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled
    return !videoTrack.enabled // Return disabled state
  }
}
```

### Camera Switching
```javascript
async switchCamera() {
  const constraints = {
    audio: true,
    video: {
      facingMode: currentMode === 'user' ? 'environment' : 'user'
    }
  }
  
  const newStream = await getUserMedia(constraints)
  const newVideoTrack = newStream.getVideoTracks()[0]
  
  // Replace track in peer connection
  const sender = pc.getSenders().find(s => s.track?.kind === 'video')
  await sender.replaceTrack(newVideoTrack)
}
```

## Error Handling

### Common WebRTC Errors
1. **getUserMedia failures**: Camera/microphone permissions
2. **ICE connection failures**: Network/firewall issues
3. **Signaling failures**: Socket.io connection problems
4. **TURN server issues**: Authentication or server problems

### Error Recovery Strategies
```javascript
pc.oniceconnectionstatechange = () => {
  switch (pc.iceConnectionState) {
    case 'failed':
      // Attempt ICE restart
      pc.restartIce()
      break
    case 'disconnected':
      // Show reconnecting UI
      showReconnectingIndicator()
      break
    case 'closed':
      // Clean up and end call
      endCall()
      break
  }
}
```

## Performance Monitoring

### Connection Statistics
```javascript
async function getConnectionStats() {
  const stats = await pc.getStats()
  let report = {
    bytesReceived: 0,
    bytesSent: 0,
    packetsLost: 0,
    roundTripTime: 0
  }
  
  stats.forEach(stat => {
    if (stat.type === 'inbound-rtp') {
      report.packetsLost += stat.packetsLost || 0
    }
    if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
      report.roundTripTime = stat.currentRoundTripTime
    }
  })
  
  return report
}
```

### Adaptive Bitrate
```javascript
// Monitor connection and adjust quality
const sender = pc.getSenders().find(s => s.track?.kind === 'video')
const params = sender.getParameters()

if (connectionQuality === 'poor') {
  // Reduce bitrate
  params.encodings[0].maxBitrate = 300000 // 300kbps
} else {
  // Increase bitrate
  params.encodings[0].maxBitrate = 1000000 // 1Mbps
}

await sender.setParameters(params)
```

## Testing WebRTC

### Local Testing
1. Use two browser tabs/windows
2. Login with different users
3. Test call initiation and acceptance
4. Verify media streams work

### Network Testing
1. **Same Network**: Should use direct P2P
2. **Different Networks**: May require TURN relay
3. **Restricted Networks**: Test with corporate firewalls

### Browser Compatibility
- **Chrome/Edge**: Full WebRTC support
- **Firefox**: Full WebRTC support
- **Safari**: iOS requires user gesture for getUserMedia
- **Mobile Browsers**: Check camera/microphone permissions

### Debug Tools
1. **Chrome**: `chrome://webrtc-internals`
2. **Firefox**: `about:webrtc`
3. **Console Logs**: Enable with `DEBUG=socket.io*`

## Production Considerations

### TURN Server Requirements
- **High Bandwidth**: Video calls consume 1-3 Mbps per user
- **Low Latency**: Under 150ms RTT for good quality
- **Geographic Distribution**: Multiple TURN servers worldwide
- **Authentication**: Secure credentials with time-based tokens

### Scaling Considerations
- **Socket.io Clustering**: Use Redis adapter for multiple backend instances
- **Database Scaling**: Index call records and user data
- **CDN**: Serve static assets from CDN
- **Load Balancing**: Sticky sessions for Socket.io

### Security Best Practices
1. **DTLS**: WebRTC uses DTLS for media encryption
2. **TURN Authentication**: Time-based credentials
3. **Origin Validation**: Verify request origins
4. **Rate Limiting**: Prevent call spam/abuse
5. **Monitoring**: Log failed connections and errors

## Troubleshooting Guide

### No Audio/Video
- Check browser permissions
- Verify getUserMedia() constraints
- Test with different devices
- Check HTTPS requirement (required for getUserMedia)

### Connection Fails
- Verify STUN/TURN configuration
- Check firewall/NAT settings
- Test with different networks
- Monitor WebRTC internals

### Poor Call Quality
- Check bandwidth availability
- Monitor packet loss statistics
- Verify TURN server latency
- Adjust video resolution/bitrate

### Calls Not Connecting
- Check Socket.io connection
- Verify signaling messages
- Test TURN server authentication
- Monitor server logs

This implementation provides a solid foundation for WebRTC calling with proper fallback mechanisms and error handling.