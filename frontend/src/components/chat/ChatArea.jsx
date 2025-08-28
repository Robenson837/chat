import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Phone, Video, MoreVertical, Send, Paperclip, Smile } from 'lucide-react'
import useChatStore from '../../store/chatStore'
import useAuthStore from '../../store/authStore'
import { buildFileUrl } from '../../services/api'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import webRTCService from '../../services/webrtc'
import socketService from '../../services/socket'

const ChatArea = () => {
  const { userId } = useParams()
  const { selectedUserId, setSelectedUser, contacts } = useChatStore()
  const { user: currentUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  // Get the current chat user
  const chatUserId = userId || selectedUserId
  const chatUser = contacts.find(contact => contact._id === chatUserId)

  useEffect(() => {
    if (userId && userId !== selectedUserId) {
      setSelectedUser(userId)
    }
  }, [userId, selectedUserId, setSelectedUser])

  const handleVoiceCall = async () => {
    if (!chatUser) return
    
    try {
      setIsLoading(true)
      await webRTCService.initiateCall(chatUser._id, 'voice')
    } catch (error) {
      console.error('Error initiating voice call:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVideoCall = async () => {
    if (!chatUser) return
    
    try {
      setIsLoading(true)
      await webRTCService.initiateCall(chatUser._id, 'video')
    } catch (error) {
      console.error('Error initiating video call:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!chatUser) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smile className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">Select a conversation to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            {chatUser.avatarPath ? (
              <img
                src={buildFileUrl(chatUser.avatarPath)}
                alt={chatUser.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {chatUser.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {chatUser.status === 'online' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
            )}
          </div>

          {/* User Info */}
          <div>
            <h2 className="font-semibold text-gray-900">{chatUser.fullName}</h2>
            <p className="text-sm text-gray-500">
              {chatUser.status === 'online' ? 'Online' : `Last seen ${new Date(chatUser.lastSeen).toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleVoiceCall}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50"
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleVideoCall}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList userId={chatUser._id} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200">
        <MessageInput recipientId={chatUser._id} />
      </div>
    </div>
  )
}

export default ChatArea