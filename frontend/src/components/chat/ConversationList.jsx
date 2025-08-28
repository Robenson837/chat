import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import useChatStore from '../../store/chatStore'
import { messagesAPI, buildFileUrl } from '../../services/api'
import LoadingSpinner from '../common/LoadingSpinner'

const ConversationList = () => {
  const navigate = useNavigate()
  const { 
    conversations, 
    setConversations, 
    selectedUserId,
    setSelectedUser,
    getFilteredConversations,
    unreadCounts 
  } = useChatStore()

  // Load conversations
  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesAPI.getConversations(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  useEffect(() => {
    if (conversationsData?.data?.conversations) {
      setConversations(conversationsData.data.conversations)
    }
  }, [conversationsData, setConversations])

  const handleSelectConversation = (conversation) => {
    setSelectedUser(conversation.otherUser._id)
    navigate(`/chat/${conversation.otherUser._id}`)
  }

  const formatLastMessage = (message) => {
    if (!message) return 'No messages yet'
    
    switch (message.content?.type) {
      case 'text':
        return message.content.text
      case 'media':
        return 'Photo'
      case 'system':
        return message.content.text
      default:
        return 'Message'
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch (error) {
      return ''
    }
  }

  const filteredConversations = getFilteredConversations()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner />
      </div>
    )
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500">
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs mt-1">Start by adding contacts</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto custom-scrollbar">
      {filteredConversations.map((conversation) => {
        const unreadCount = unreadCounts[conversation.conversationId] || 0
        const isSelected = selectedUserId === conversation.otherUser._id

        return (
          <div
            key={conversation.conversationId}
            onClick={() => handleSelectConversation(conversation)}
            className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 transition-all ${
              isSelected 
                ? 'bg-primary/5 border-primary' 
                : 'border-transparent'
            }`}
          >
            {/* Avatar */}
            <div className="relative mr-3">
              {conversation.otherUser.avatarPath ? (
                <img
                  src={buildFileUrl(conversation.otherUser.avatarPath)}
                  alt={conversation.otherUser.fullName}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium"
                style={{ display: conversation.otherUser.avatarPath ? 'none' : 'flex' }}
              >
                {conversation.otherUser.fullName.charAt(0).toUpperCase()}
              </div>
              
              {/* Online indicator */}
              {conversation.otherUser.status === 'online' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 truncate">
                  {conversation.otherUser.fullName}
                </h3>
                <div className="flex items-center space-x-1">
                  {conversation.lastMessage?.createdAt && (
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(conversation.lastMessage.createdAt)}
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <div className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-gray-500 truncate mr-2">
                  {formatLastMessage(conversation.lastMessage)}
                </p>
                
                {/* Message status */}
                {conversation.lastMessage?.status && conversation.lastMessage?.sender === selectedUserId && (
                  <div className="flex-shrink-0">
                    {conversation.lastMessage.status === 'sent' && (
                      <div className="w-4 h-4 text-gray-400">
                        <svg viewBox="0 0 16 16" className="w-4 h-4">
                          <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                        </svg>
                      </div>
                    )}
                    {conversation.lastMessage.status === 'delivered' && (
                      <div className="w-4 h-4 text-gray-500">
                        <svg viewBox="0 0 16 16" className="w-4 h-4">
                          <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                          <path fill="currentColor" d="M10.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L3.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                        </svg>
                      </div>
                    )}
                    {conversation.lastMessage.status === 'read' && (
                      <div className="w-4 h-4 text-blue-500">
                        <svg viewBox="0 0 16 16" className="w-4 h-4">
                          <path fill="currentColor" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                          <path fill="currentColor" d="M10.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L3.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ConversationList