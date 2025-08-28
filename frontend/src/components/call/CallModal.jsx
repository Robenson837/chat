import React, { useEffect, useRef } from 'react'
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  PhoneCall,
  RotateCcw,
  Settings,
  Minimize2
} from 'lucide-react'
import useCallStore from '../../store/callStore'
import useAuthStore from '../../store/authStore'
import webRTCService from '../../services/webrtc'
import { buildFileUrl } from '../../services/api'

const CallModal = () => {
  const {
    isInCall,
    callId,
    callType,
    callStatus,
    callDirection,
    remoteUser,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    callDuration,
    getFormattedDuration,
    isCallModalOpen,
    setCallModalOpen,
    toggleMute,
    toggleVideo,
    updateCallDuration,
    showCallStats,
    toggleCallStats,
    connectionStats
  } = useCallStore()

  const { user: currentUser } = useAuthStore()
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const durationIntervalRef = useRef(null)

  // Handle local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Handle remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Update call duration
  useEffect(() => {
    if (callStatus === 'connected') {
      durationIntervalRef.current = setInterval(() => {
        updateCallDuration()
      }, 1000)
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [callStatus, updateCallDuration])

  if (!isInCall || !isCallModalOpen) return null

  const handleAnswerCall = async () => {
    try {
      await webRTCService.answerCall(callId, remoteUser._id, callType)
      await webRTCService.createOffer()
    } catch (error) {
      console.error('Error answering call:', error)
    }
  }

  const handleDeclineCall = () => {
    webRTCService.declineCall()
  }

  const handleEndCall = () => {
    webRTCService.endCall()
  }

  const handleToggleMute = () => {
    const muted = webRTCService.toggleMute()
    toggleMute()
  }

  const handleToggleVideo = () => {
    const disabled = webRTCService.toggleVideo()
    toggleVideo()
  }

  const handleSwitchCamera = () => {
    webRTCService.switchCamera()
  }

  const handleMinimize = () => {
    setCallModalOpen(false)
  }

  const renderCallStatus = () => {
    switch (callStatus) {
      case 'ringing':
        if (callDirection === 'incoming') {
          return (
            <div className="text-center">
              <p className="text-lg text-white mb-2">Incoming {callType} call</p>
              <p className="text-sm text-gray-300">{remoteUser.fullName}</p>
            </div>
          )
        } else {
          return (
            <div className="text-center">
              <p className="text-lg text-white mb-2">Calling...</p>
              <p className="text-sm text-gray-300">{remoteUser.fullName}</p>
            </div>
          )
        }
      case 'connecting':
        return (
          <div className="text-center">
            <p className="text-lg text-white mb-2">Connecting...</p>
            <p className="text-sm text-gray-300">{remoteUser.fullName}</p>
          </div>
        )
      case 'connected':
        return (
          <div className="text-center">
            <p className="text-lg text-white mb-2">{getFormattedDuration()}</p>
            <p className="text-sm text-gray-300">{remoteUser.fullName}</p>
          </div>
        )
      default:
        return null
    }
  }

  const renderCallControls = () => {
    if (callStatus === 'ringing' && callDirection === 'incoming') {
      return (
        <div className="flex justify-center space-x-8">
          {/* Decline */}
          <button
            onClick={handleDeclineCall}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <PhoneOff className="w-8 h-8" />
          </button>
          
          {/* Answer */}
          <button
            onClick={handleAnswerCall}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <Phone className="w-8 h-8" />
          </button>
        </div>
      )
    }

    return (
      <div className="flex justify-center space-x-4">
        {/* Mute Toggle */}
        <button
          onClick={handleToggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors ${
            isMuted 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Video Toggle (only for video calls) */}
        {callType === 'video' && (
          <button
            onClick={handleToggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors ${
              !isVideoEnabled 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {!isVideoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        {/* Switch Camera (only for video calls) */}
        {callType === 'video' && (
          <button
            onClick={handleSwitchCamera}
            className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        )}

        {/* Stats Toggle */}
        <button
          onClick={toggleCallStats}
          className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <Settings className="w-6 h-6" />
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black bg-opacity-20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <PhoneCall className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-medium">Vigi Call</p>
            <p className="text-gray-300 text-sm capitalize">{callType}</p>
          </div>
        </div>

        <button
          onClick={handleMinimize}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Video Area */}
      {callType === 'video' && (
        <div className="flex-1 relative">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-gray-800"
          />

          {/* Local Video - Picture in Picture */}
          <div className="absolute top-4 right-4 w-32 h-24 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Remote User Avatar (when no video) */}
          {!remoteStream && remoteUser && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                  {remoteUser.avatarPath ? (
                    <img
                      src={buildFileUrl(remoteUser.avatarPath)}
                      alt={remoteUser.fullName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-4xl font-medium text-white">
                      {remoteUser.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-white text-xl font-medium">{remoteUser.fullName}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio Only View */}
      {callType === 'voice' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mb-8 mx-auto">
              {remoteUser.avatarPath ? (
                <img
                  src={buildFileUrl(remoteUser.avatarPath)}
                  alt={remoteUser.fullName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-4xl font-medium text-white">
                  {remoteUser.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {renderCallStatus()}
          </div>
        </div>
      )}

      {/* Stats Overlay */}
      {showCallStats && connectionStats && callStatus === 'connected' && (
        <div className="absolute top-20 left-4 bg-black bg-opacity-50 rounded-lg p-3 text-white text-xs">
          <h4 className="font-medium mb-2">Connection Stats</h4>
          <div className="space-y-1">
            <p>Packets Lost: {connectionStats.packetsLost}</p>
            <p>Jitter: {(connectionStats.jitter * 1000).toFixed(2)}ms</p>
            <p>RTT: {(connectionStats.roundTripTime * 1000).toFixed(2)}ms</p>
            <p>Bytes Sent: {(connectionStats.bytesSent / 1024).toFixed(1)}KB</p>
            <p>Bytes Received: {(connectionStats.bytesReceived / 1024).toFixed(1)}KB</p>
          </div>
        </div>
      )}

      {/* Call Status */}
      {callType === 'video' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {renderCallStatus()}
        </div>
      )}

      {/* Controls */}
      <div className="p-6 bg-black bg-opacity-20">
        {renderCallControls()}
      </div>
    </div>
  )
}

export default CallModal