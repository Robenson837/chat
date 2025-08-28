import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, X, Image } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { messagesAPI, uploadAPI } from '../../services/api'
import socketService from '../../services/socket'
import toast from 'react-hot-toast'
import LoadingSpinner from '../common/LoadingSpinner'

const MessageInput = ({ recipientId }) => {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: messagesAPI.sendMessage,
    onSuccess: () => {
      setMessage('')
      setAttachments([])
      textareaRef.current?.focus()
    },
    onError: (error) => {
      toast.error('Failed to send message')
      console.error('Send message error:', error)
    }
  })

  // Handle typing indicators
  useEffect(() => {
    const conversationId = `conversation_${recipientId}`
    
    if (message.trim() && !isTyping) {
      setIsTyping(true)
      socketService.sendTypingStart(recipientId, conversationId)
    } else if (!message.trim() && isTyping) {
      setIsTyping(false)
      socketService.sendTypingStop(recipientId, conversationId)
    }

    // Clear typing timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (message.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false)
          socketService.sendTypingStop(recipientId, conversationId)
        }
      }, 2000)
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [message, recipientId, isTyping])

  // Stop typing on component unmount
  useEffect(() => {
    return () => {
      if (isTyping) {
        const conversationId = `conversation_${recipientId}`
        socketService.sendTypingStop(recipientId, conversationId)
      }
    }
  }, [recipientId, isTyping])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if ((!message.trim() && attachments.length === 0) || sendMessageMutation.isPending) {
      return
    }

    // Stop typing indicator
    if (isTyping) {
      const conversationId = `conversation_${recipientId}`
      socketService.sendTypingStop(recipientId, conversationId)
      setIsTyping(false)
    }

    const messageData = {
      recipientId,
      content: {
        type: attachments.length > 0 ? 'media' : 'text',
        text: message.trim() || undefined
      }
    }

    // Add attachments if any
    if (attachments.length > 0) {
      messageData.attachments = attachments
    }

    sendMessageMutation.mutate(messageData)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setIsUploading(true)
    
    try {
      const response = await uploadAPI.uploadAttachments(files)
      const uploadedAttachments = response.data.attachments
      
      setAttachments(prev => [...prev, ...uploadedAttachments])
      toast.success(`${files.length} file(s) uploaded`)
    } catch (error) {
      toast.error('Failed to upload files')
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="p-4">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative group">
              {attachment.mimeType?.startsWith('image/') ? (
                <div className="relative">
                  <img
                    src={`http://localhost:3000${attachment.filePath}`}
                    alt={attachment.originalName}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="relative bg-gray-100 border border-gray-200 rounded-lg p-3 w-32">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {attachment.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.fileSize)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          title="Attach file"
        >
          {isUploading ? (
            <LoadingSpinner size="small" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              adjustTextareaHeight()
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="w-full px-4 py-2 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            style={{ maxHeight: '120px' }}
          />
          
          {/* Emoji Button */}
          <button
            type="button"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 rounded-full transition-colors"
            title="Add emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!message.trim() && attachments.length === 0) || sendMessageMutation.isPending}
          className="flex-shrink-0 p-2 bg-primary text-white rounded-full hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Send message"
        >
          {sendMessageMutation.isPending ? (
            <LoadingSpinner size="small" color="white" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  )
}

export default MessageInput