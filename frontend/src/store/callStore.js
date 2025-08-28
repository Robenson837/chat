import { create } from 'zustand'

const useCallStore = create((set, get) => ({
  // State
  isInCall: false,
  callId: null,
  callType: null, // 'voice' | 'video'
  callStatus: null, // 'ringing' | 'connecting' | 'connected' | 'ended'
  callDirection: null, // 'incoming' | 'outgoing'
  
  // Participant info
  localUserId: null,
  remoteUser: null,
  
  // WebRTC state
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  
  // Call controls
  isMuted: false,
  isVideoEnabled: true,
  isSpeakerOn: false,
  
  // Call statistics
  callStartTime: null,
  callDuration: 0,
  connectionStats: null,
  
  // UI state
  isCallModalOpen: false,
  showCallStats: false,
  
  // Actions - Call Management
  startCall: (callData) => {
    set({
      isInCall: true,
      callId: callData.callId,
      callType: callData.type,
      callStatus: 'ringing',
      callDirection: 'outgoing',
      localUserId: callData.localUserId,
      remoteUser: callData.remoteUser,
      isCallModalOpen: true,
      callStartTime: new Date(),
    })
  },
  
  receiveCall: (callData) => {
    set({
      isInCall: true,
      callId: callData.callId,
      callType: callData.type,
      callStatus: 'ringing',
      callDirection: 'incoming',
      localUserId: callData.localUserId,
      remoteUser: callData.caller,
      isCallModalOpen: true,
    })
  },
  
  answerCall: () => {
    set({
      callStatus: 'connecting',
      callStartTime: new Date(),
    })
  },
  
  connectCall: () => {
    set({
      callStatus: 'connected',
    })
  },
  
  endCall: (reason = 'user_hangup') => {
    const { peerConnection, localStream } = get()
    
    // Clean up WebRTC resources
    if (peerConnection) {
      peerConnection.close()
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    
    set({
      isInCall: false,
      callId: null,
      callType: null,
      callStatus: 'ended',
      callDirection: null,
      localUserId: null,
      remoteUser: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isMuted: false,
      isVideoEnabled: true,
      isSpeakerOn: false,
      callStartTime: null,
      callDuration: 0,
      connectionStats: null,
      isCallModalOpen: false,
      showCallStats: false,
    })
  },
  
  declineCall: () => {
    get().endCall('declined')
  },
  
  // Actions - Media Controls
  setLocalStream: (stream) => {
    set({ localStream: stream })
  },
  
  setRemoteStream: (stream) => {
    set({ remoteStream: stream })
  },
  
  setPeerConnection: (pc) => {
    set({ peerConnection: pc })
  },
  
  toggleMute: () => {
    const { isMuted, localStream } = get()
    
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMuted
      }
    }
    
    set({ isMuted: !isMuted })
  },
  
  toggleVideo: () => {
    const { isVideoEnabled, localStream } = get()
    
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled
      }
    }
    
    set({ isVideoEnabled: !isVideoEnabled })
  },
  
  toggleSpeaker: () => {
    const { isSpeakerOn } = get()
    set({ isSpeakerOn: !isSpeakerOn })
  },
  
  // Actions - Statistics
  updateCallDuration: () => {
    const { callStartTime, callStatus } = get()
    
    if (callStatus === 'connected' && callStartTime) {
      const duration = Math.floor((Date.now() - callStartTime.getTime()) / 1000)
      set({ callDuration: duration })
    }
  },
  
  updateConnectionStats: (stats) => {
    set({ connectionStats: stats })
  },
  
  // Actions - UI
  setCallModalOpen: (isOpen) => {
    set({ isCallModalOpen: isOpen })
  },
  
  toggleCallStats: () => {
    const { showCallStats } = get()
    set({ showCallStats: !showCallStats })
  },
  
  // Getters
  getFormattedDuration: () => {
    const { callDuration } = get()
    const minutes = Math.floor(callDuration / 60)
    const seconds = callDuration % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  },
  
  canToggleVideo: () => {
    const { callType, isInCall, callStatus } = get()
    return isInCall && callType === 'video' && ['connecting', 'connected'].includes(callStatus)
  },
  
  canToggleAudio: () => {
    const { isInCall, callStatus } = get()
    return isInCall && ['connecting', 'connected'].includes(callStatus)
  },
  
  isCallActive: () => {
    const { isInCall, callStatus } = get()
    return isInCall && ['ringing', 'connecting', 'connected'].includes(callStatus)
  },
  
  // WebRTC Configuration
  getWebRTCConfig: () => ({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      ...(process.env.VITE_TURN_HOST ? [{
        urls: `turn:${process.env.VITE_TURN_HOST}:${process.env.VITE_TURN_PORT || 3478}`,
        username: process.env.VITE_TURN_USER,
        credential: process.env.VITE_TURN_PASS,
      }] : [])
    ],
    iceCandidatePoolSize: 10,
  }),
  
  // Reset store
  reset: () => {
    const { endCall } = get()
    endCall()
  },
}))

export default useCallStore