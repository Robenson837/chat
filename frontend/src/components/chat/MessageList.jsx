import React, { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import useChatStore from '../../store/chatStore'
import useAuthStore from '../../store/authStore'
import { messagesAPI, buildFileUrl } from '../../services/api'
import socketService from '../../services/socket'
import LoadingSpinner from '../common/LoadingSpinner'

const MessageList = ({ userId }) => {
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const { user: currentUser } = useAuthStore()
  const { getMessages, addMessage, prependMessages } = useChatStore()
  
  const conversationId = `conversation_${[currentUser._id, userId].sort().join('_')}`
  const messages = getMessages(conversationId)

  // Load messages
  const { data: messagesData, isLoading, refetch } = useQuery({
    queryKey: ['messages', userId, page],
    queryFn: () => messagesAPI.getConversation(userId, page),
    enabled: !!userId,
  })

  useEffect(() => {
    if (messagesData?.data?.messages) {
      if (page === 1) {
        // First load - replace all messages
        const conversationMessages = messagesData.data.messages
        useChatStore.getState().setMessages(conversationId, conversationMessages)
      } else {
        // Load more - prepend older messages
        prependMessages(conversationId, messagesData.data.messages)
      }
      
      setHasMore(messagesData.data.messages.length === 50) // Assuming 50 is the limit
    }
  }, [messagesData, page, conversationId, prependMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (page === 1) {
      scrollToBottom()
    }
  }, [messages, page])

  // Mark messages as read when component mounts or userId changes
  useEffect(() => {
    if (userId) {
      messagesAPI.markAsRead(userId).catch(console.error)
    }
  }, [userId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (container && container.scrollTop === 0 && hasMore && !isLoading) {
      setPage(prev => prev + 1)
    }
  }

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) {
      return format(date, 'HH:mm')
    } else if (diffInDays === 1) {
      return 'Yesterday ' + format(date, 'HH:mm')
    } else if (diffInDays < 7) {
      return format(date, 'EEE HH:mm')
    } else {
      return format(date, 'dd/MM/yyyy HH:mm')
    }
  }

  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Send a message to start the conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar"
      onScroll={handleScroll}
    >
      {/* Load more indicator */}
      {isLoading && page > 1 && (
        <div className="flex justify-center py-2">
          <LoadingSpinner size="small" />
        </div>
      )}
      
      {/* Messages */}
      {messages.map((message, index) => {
        const isCurrentUser = message.sender._id === currentUser._id
        const showAvatar = !isCurrentUser && (
          index === messages.length - 1 ||
          messages[index + 1]?.sender._id !== message.sender._id
        )
        const showTimestamp = 
          index === messages.length - 1 ||
          new Date(messages[index + 1]?.createdAt) - new Date(message.createdAt) > 5 * 60 * 1000 // 5 minutes

        return (
          <MessageItem
            key={message._id}
            message={message}
            isCurrentUser={isCurrentUser}
            showAvatar={showAvatar}
            showTimestamp={showTimestamp}
            formatMessageTime={formatMessageTime}
          />
        )
      })}
      
      <div ref={messagesEndRef} />
    </div>
  )
}

const MessageItem = ({ message, isCurrentUser, showAvatar, showTimestamp, formatMessageTime }) => {
  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return (
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16">
            <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
          </svg>
        )
      case 'delivered':
        return (
          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 16 16">
            <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
            <path fill="currentColor" d="M10.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L3.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
          </svg>
        )
      case 'read':
        return (
          <svg className="w-4 h-4 text-blue-500" viewBox="0 0 16 16">
            <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
            <path fill="currentColor" d="M10.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L3.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end space-x-2 max-w-xs sm:max-w-md ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        {showAvatar && !isCurrentUser && (
          <div className="flex-shrink-0">
            {message.sender.avatarPath ? (
              <img
                src={buildFileUrl(message.sender.avatarPath)}
                alt={message.sender.fullName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {message.sender.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Spacer when no avatar */}
        {!showAvatar && !isCurrentUser && <div className="w-8" />}

        {/* Message bubble */}
        <div className={`px-4 py-2 rounded-lg ${
          isCurrentUser 
            ? 'bg-primary text-white rounded-br-sm' 
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}>
          {/* Reply context */}
          {message.replyTo && (
            <div className={`text-xs opacity-75 mb-1 p-2 rounded ${
              isCurrentUser ? 'bg-primary-dark' : 'bg-gray-200'
            }`}>
              <p className="font-medium">{message.replyTo.sender.fullName}</p>
              <p className="truncate">{message.replyTo.content.text}</p>
            </div>
          )}

          {/* Message content */}
          {message.content.type === 'text' && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content.text}</p>
          )}

          {message.content.type === 'media' && (
            <div className="space-y-2">
              {message.attachments?.map((attachment, index) => (
                <div key={index} className="max-w-sm">
                  {attachment.mimeType?.startsWith('image/') ? (
                    <img
                      src={buildFileUrl(attachment.filePath)}
                      alt={attachment.originalName}
                      className="rounded-lg max-w-full h-auto"
                    />
                  ) : (
                    <div className={`p-3 rounded-lg border ${
                      isCurrentUser ? 'border-primary-light' : 'border-gray-300'
                    }`}>
                      <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                      <p className="text-xs opacity-75">{(attachment.fileSize / 1024).toFixed(1)} KB</p>
                    </div>
                  )}
                </div>
              ))}
              {message.content.text && (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content.text}</p>
              )}
            </div>
          )}

          {message.content.type === 'system' && (
            <p className="text-sm italic opacity-75">{message.content.text}</p>
          )}

          {/* Edited indicator */}
          {message.edited?.isEdited && (
            <p className="text-xs opacity-50 mt-1">edited</p>
          )}
        </div>
      </div>

      {/* Message info */}
      {showTimestamp && (
        <div className={`mt-1 flex items-center space-x-1 ${
          isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''
        }`}>
          <span className="text-xs text-gray-500">
            {formatMessageTime(message.createdAt)}
          </span>
          {isCurrentUser && getMessageStatusIcon(message.status)}
        </div>
      )}
    </div>
  )
}

export default MessageList