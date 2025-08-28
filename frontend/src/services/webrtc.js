import socketService from './socket'
import useCallStore from '../store/callStore'
import toast from 'react-hot-toast'
import soundService from './sound'

class WebRTCService {
  constructor() {
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    this.callId = null
    this.remoteUserId = null
    this.isInitiator = false
    
    // Initialize sound service
    soundService.init()
    
    // Make this available globally for socket service
    window.webRTCService = this
  }

  // Check if media devices are available and permissions granted
  async checkMediaPermissions(type = 'video') {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported')
      }

      const constraints = {
        audio: true,
        video: type === 'video'
      }

      // Test access to media devices
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop())
      
      return true
    } catch (error) {
      console.error('Media permissions check failed:', error)
      return false
    }
  }

  // Get WebRTC configuration with STUN/TURN servers
  getConfiguration() {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN server if configured
        ...(import.meta.env.VITE_TURN_HOST ? [{
          urls: `turn:${import.meta.env.VITE_TURN_HOST}:${import.meta.env.VITE_TURN_PORT || 3478}`,
          username: import.meta.env.VITE_TURN_USER,
          credential: import.meta.env.VITE_TURN_PASS,
        }] : [])
      ],
      iceCandidatePoolSize: 10,
    }
  }

  // Initialize call (caller side)
  async initiateCall(calleeId, type = 'video') {
    try {
      const callStore = useCallStore.getState()
      
      this.callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      this.remoteUserId = calleeId
      this.isInitiator = true

      // Stop existing stream if it exists
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop())
        this.localStream = null
      }

      // Get user media
      const constraints = {
        audio: true,
        video: type === 'video'
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      callStore.setLocalStream(this.localStream)

      // Create peer connection
      this.createPeerConnection()

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // Send call initiation through socket
      socketService.initiateCall(calleeId, type)

      // Play outgoing ringtone for caller
      soundService.playOutgoingRingtone()

    } catch (error) {
      console.error('Error initiating call:', error)
      let errorMessage = 'Failed to start call. Please check camera/microphone permissions.'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera/microphone found. Please check your devices.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use by another application.'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone constraints cannot be satisfied.'
      }
      
      toast.error(errorMessage)
      throw error
    }
  }

  // Answer incoming call
  async answerCall(callId, callerId, type = 'video') {
    try {
      const callStore = useCallStore.getState()
      
      this.callId = callId
      this.remoteUserId = callerId
      this.isInitiator = false

      // Stop existing stream if it exists
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop())
        this.localStream = null
      }

      // Get user media
      const constraints = {
        audio: true,
        video: type === 'video'
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      callStore.setLocalStream(this.localStream)

      // Create peer connection
      this.createPeerConnection()

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })

      // Answer call through socket
      socketService.answerCall(callId)

    } catch (error) {
      console.error('Error answering call:', error)
      let errorMessage = 'Failed to answer call. Please check camera/microphone permissions.'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera/microphone found. Please check your devices.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use by another application.'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone constraints cannot be satisfied.'
      }
      
      toast.error(errorMessage)
      throw error
    }
  }

  // Create peer connection
  createPeerConnection() {
    const callStore = useCallStore.getState()
    
    this.peerConnection = new RTCPeerConnection(this.getConfiguration())
    callStore.setPeerConnection(this.peerConnection)

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote stream')
      const [remoteStream] = event.streams
      this.remoteStream = remoteStream
      callStore.setRemoteStream(remoteStream)
      callStore.connectCall()
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate')
        socketService.sendICECandidate(this.callId, event.candidate, this.remoteUserId)
      }
    }

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState)
      
      switch (this.peerConnection.connectionState) {
        case 'connected':
          callStore.connectCall()
          this.startConnectionStats()
          break
        case 'disconnected':
        case 'failed':
        case 'closed':
          this.cleanup()
          break
      }
    }

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection.iceConnectionState)
      
      if (this.peerConnection.iceConnectionState === 'failed') {
        toast.error('Connection failed. Check your network or try again.')
      }
    }
  }

  // Create and send offer (initiator only)
  async createOffer() {
    if (!this.peerConnection || !this.isInitiator) return

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })

      await this.peerConnection.setLocalDescription(offer)
      
      console.log('Sending offer')
      socketService.sendWebRTCOffer(this.callId, offer, this.remoteUserId)
    } catch (error) {
      console.error('Error creating offer:', error)
      toast.error('Failed to create call offer')
    }
  }

  // Handle incoming offer
  async handleOffer(data) {
    const { offer, from, callId } = data
    
    if (!this.peerConnection || this.callId !== callId) {
      console.warn('Received offer for unknown call')
      return
    }

    try {
      console.log('Received offer, creating answer')
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      
      console.log('Sending answer')
      socketService.sendWebRTCAnswer(callId, answer, from)
    } catch (error) {
      console.error('Error handling offer:', error)
      toast.error('Failed to process call offer')
    }
  }

  // Handle incoming answer
  async handleAnswer(data) {
    const { answer, from, callId } = data
    
    if (!this.peerConnection || this.callId !== callId) {
      console.warn('Received answer for unknown call')
      return
    }

    try {
      console.log('Received answer')
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (error) {
      console.error('Error handling answer:', error)
      toast.error('Failed to process call answer')
    }
  }

  // Handle incoming ICE candidate
  async handleIceCandidate(data) {
    const { candidate, from, callId } = data
    
    if (!this.peerConnection || this.callId !== callId) {
      console.warn('Received ICE candidate for unknown call')
      return
    }

    try {
      console.log('Adding ICE candidate')
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('Error adding ICE candidate:', error)
      // Don't show error toast for ICE candidate failures (common and usually recoverable)
    }
  }

  // Toggle audio mute
  toggleMute() {
    if (!this.localStream) return false

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      return !audioTrack.enabled // Return muted state
    }
    return false
  }

  // Toggle video
  toggleVideo() {
    if (!this.localStream) return false

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      return !videoTrack.enabled // Return disabled state
    }
    return false
  }

  // Switch camera (front/back on mobile)
  async switchCamera() {
    if (!this.localStream) return

    try {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (!videoTrack) return

      // Get current constraints
      const constraints = videoTrack.getConstraints()
      
      // Toggle facingMode
      const newConstraints = {
        audio: true,
        video: {
          ...constraints,
          facingMode: constraints.facingMode === 'user' ? 'environment' : 'user'
        }
      }

      // Get new stream
      const newStream = await navigator.mediaDevices.getUserMedia(newConstraints)
      const newVideoTrack = newStream.getVideoTracks()[0]

      // Replace track in peer connection
      const sender = this.peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      )
      
      if (sender) {
        await sender.replaceTrack(newVideoTrack)
      }

      // Stop old track and update stream
      videoTrack.stop()
      
      // Update local stream
      this.localStream.removeTrack(videoTrack)
      this.localStream.addTrack(newVideoTrack)
      
      // Update store
      const callStore = useCallStore.getState()
      callStore.setLocalStream(this.localStream)

    } catch (error) {
      console.error('Error switching camera:', error)
      toast.error('Failed to switch camera')
    }
  }

  // Start collecting connection statistics
  startConnectionStats() {
    if (!this.peerConnection) return

    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.peerConnection.getStats()
        const report = this.parseStatsReport(stats)
        
        const callStore = useCallStore.getState()
        callStore.updateConnectionStats(report)
      } catch (error) {
        console.error('Error getting connection stats:', error)
      }
    }, 2000) // Update every 2 seconds
  }

  // Parse WebRTC stats report
  parseStatsReport(stats) {
    let report = {
      bytesReceived: 0,
      bytesSent: 0,
      packetsLost: 0,
      packetsReceived: 0,
      jitter: 0,
      roundTripTime: 0,
      bitrate: {
        audio: { in: 0, out: 0 },
        video: { in: 0, out: 0 }
      }
    }

    stats.forEach(stat => {
      if (stat.type === 'inbound-rtp') {
        report.bytesReceived += stat.bytesReceived || 0
        report.packetsLost += stat.packetsLost || 0
        report.packetsReceived += stat.packetsReceived || 0
        report.jitter = Math.max(report.jitter, stat.jitter || 0)
      } else if (stat.type === 'outbound-rtp') {
        report.bytesSent += stat.bytesSent || 0
      } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        report.roundTripTime = stat.currentRoundTripTime || 0
      }
    })

    return report
  }

  // End call
  endCall() {
    console.log('Ending call')
    
    // Stop ringtones
    soundService.stopRingtones()
    
    if (this.callId) {
      socketService.endCall(this.callId)
    }
    
    this.cleanup()
  }

  // Decline call
  declineCall() {
    console.log('Declining call')
    
    // Stop ringtones
    soundService.stopRingtones()
    
    if (this.callId) {
      socketService.declineCall(this.callId)
    }
    
    this.cleanup()
  }

  // Cleanup resources
  cleanup() {
    console.log('Cleaning up WebRTC resources')
    
    // Clear stats interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // Clear remote stream
    this.remoteStream = null
    
    // Reset state
    this.callId = null
    this.remoteUserId = null
    this.isInitiator = false

    // Update call store
    const callStore = useCallStore.getState()
    callStore.endCall()
  }
}

// Create singleton instance
const webRTCService = new WebRTCService()

export default webRTCService