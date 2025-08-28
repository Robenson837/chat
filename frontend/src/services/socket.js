import { io } from 'socket.io-client'
import useAuthStore from '../store/authStore'
import useChatStore from '../store/chatStore'
import useCallStore from '../store/callStore'
import toast from 'react-hot-toast'
import soundService from './sound'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnecting = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
  }

  connect() {
    if (this.socket?.connected || this.isConnecting) return

    const token = useAuthStore.getState().getToken()
    if (!token) return

    this.isConnecting = true

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3000')

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
    })

    this.setupEventListeners()
  }

  setupEventListeners() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server')
      this.isConnecting = false
      this.reconnectAttempts = 0
      toast.success('Connected to server')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason)
      this.isConnecting = false
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return
      }
      
      // Client initiated disconnect or network issues
      this.handleReconnect()
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      this.isConnecting = false
      this.handleReconnect()
    })

    // Chat events
    this.setupChatListeners()
    
    // Call events  
    this.setupCallListeners()

    // Presence events
    this.setupPresenceListeners()
  }

  setupChatListeners() {
    const chatStore = useChatStore.getState()

    // New message received
    this.socket.on('new_message', (message) => {
      const conversationId = message.conversationId
      chatStore.addMessage(conversationId, message)
      chatStore.updateConversationLastMessage(conversationId, message)
      
      // Show notification if not in the conversation
      const { selectedUserId } = useChatStore.getState()
      if (selectedUserId !== message.sender._id) {
        toast.success(`New message from ${message.sender.fullName}`)
        
        // Play notification sound
        soundService.playNotification()
      }
    })

    // Message sent confirmation
    this.socket.on('message_sent', (message) => {
      const conversationId = message.conversationId
      chatStore.addMessage(conversationId, message)
      chatStore.updateConversationLastMessage(conversationId, message)
    })

    // Message status updates
    this.socket.on('message_status_update', (data) => {
      const { messageId, status, deliveredAt, readAt } = data
      
      // Find which conversation this message belongs to
      const { messages } = useChatStore.getState()
      let targetConversationId = null
      
      for (const [conversationId, conversationMessages] of Object.entries(messages)) {
        if (conversationMessages.some(m => m._id === messageId)) {
          targetConversationId = conversationId
          break
        }
      }
      
      if (targetConversationId) {
        chatStore.updateMessageStatus(
          targetConversationId, 
          messageId, 
          status, 
          deliveredAt || readAt
        )
      }
    })

    // Messages marked as read
    this.socket.on('messages_read', (data) => {
      const { conversationId } = data
      chatStore.clearUnreadCount(conversationId)
    })

    // Message deleted
    this.socket.on('message_deleted', (data) => {
      const { messageId, conversationId } = data
      chatStore.removeMessage(conversationId, messageId)
    })

    // Message edited
    this.socket.on('message_edited', (message) => {
      const conversationId = message.conversationId
      chatStore.updateMessage(conversationId, message._id, message)
    })

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      const { userId, conversationId, isTyping } = data
      chatStore.setTypingUser(conversationId, userId, isTyping)
    })

    // Contact events
    this.socket.on('contact_request', (data) => {
      chatStore.addContactRequest(data)
      toast.success(`Contact request from ${data.from.fullName}`)
    })

    this.socket.on('contact_accepted', (data) => {
      chatStore.addContact(data.user)
      chatStore.removeContactRequest(data.user._id)
      toast.success(`${data.user.fullName} accepted your contact request`)
    })

    this.socket.on('contact_declined', (data) => {
      toast.error(`${data.user.fullName} declined your contact request`)
    })

    this.socket.on('new_contact', (data) => {
      chatStore.addContact(data.user)
    })

    this.socket.on('contact_removed', (data) => {
      chatStore.removeContact(data.user._id)
      toast.error(`${data.user.fullName} removed you from contacts`)
    })

    this.socket.on('contact_request_cancelled', (data) => {
      chatStore.removeContactRequest(data.from._id)
    })
  }

  setupCallListeners() {
    const callStore = useCallStore.getState()
    const currentUser = useAuthStore.getState().getUser()

    // Incoming call
    this.socket.on('incoming_call', (data) => {
      const { callId, caller, type } = data
      
      callStore.receiveCall({
        callId,
        type,
        localUserId: currentUser._id,
        caller,
      })
      
      toast.success(`Incoming ${type} call from ${caller.fullName}`)
      soundService.playIncomingRingtone()
    })

    // Call initiated confirmation
    this.socket.on('call_initiated', (data) => {
      // Call is ringing on the other end
    })

    // Call answered
    this.socket.on('call_answered', (data) => {
      callStore.answerCall()
      soundService.stopRingtones()
    })

    // Call ended
    this.socket.on('call_ended', (data) => {
      const { reason, endedBy, duration } = data
      callStore.endCall(reason)
      soundService.stopRingtones()
      
      if (reason === 'declined') {
        toast.error('Call declined')
      } else if (reason === 'missed') {
        toast.error('Call missed')
      }
    })

    // Call error
    this.socket.on('call_error', (data) => {
      toast.error(data.error)
      callStore.endCall('failed')
    })

    // WebRTC signaling
    this.socket.on('webrtc_offer', (data) => {
      // Handle WebRTC offer in WebRTC service
      window.webRTCService?.handleOffer(data)
    })

    this.socket.on('webrtc_answer', (data) => {
      // Handle WebRTC answer in WebRTC service
      window.webRTCService?.handleAnswer(data)
    })

    this.socket.on('webrtc_ice_candidate', (data) => {
      // Handle ICE candidate in WebRTC service
      window.webRTCService?.handleIceCandidate(data)
    })
  }

  setupPresenceListeners() {
    const chatStore = useChatStore.getState()

    // Online contacts list
    this.socket.on('online_contacts', (contacts) => {
      chatStore.setOnlineUsers(contacts)
    })

    // User status changed
    this.socket.on('user_status_changed', (data) => {
      const { userId, status, lastSeen } = data
      
      if (status === 'online') {
        chatStore.addOnlineUser(userId)
      } else {
        chatStore.removeOnlineUser(userId)
      }
      
      chatStore.updateContactStatus(userId, status, lastSeen)
    })
  }

  // Messaging methods
  sendTypingStart(recipientId, conversationId) {
    this.socket?.emit('typing_start', { recipientId, conversationId })
  }

  sendTypingStop(recipientId, conversationId) {
    this.socket?.emit('typing_stop', { recipientId, conversationId })
  }

  markMessageDelivered(messageId, conversationId) {
    this.socket?.emit('message_delivered', { messageId, conversationId })
  }

  markMessageRead(messageId, conversationId) {
    this.socket?.emit('message_read', { messageId, conversationId })
  }

  // Call methods
  initiateCall(calleeId, type) {
    this.socket?.emit('call_initiate', { calleeId, type })
  }

  answerCall(callId) {
    this.socket?.emit('call_answer', { callId })
  }

  declineCall(callId) {
    this.socket?.emit('call_decline', { callId })
  }

  endCall(callId) {
    this.socket?.emit('call_end', { callId })
  }

  // WebRTC signaling methods
  sendWebRTCOffer(callId, offer, to) {
    this.socket?.emit('webrtc_offer', { callId, offer, to })
  }

  sendWebRTCAnswer(callId, answer, to) {
    this.socket?.emit('webrtc_answer', { callId, answer, to })
  }

  sendICECandidate(callId, candidate, to) {
    this.socket?.emit('webrtc_ice_candidate', { callId, candidate, to })
  }

  // Utility methods - now handled by soundService

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast.error('Connection lost. Please refresh the page.')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    setTimeout(() => {
      if (!this.socket?.connected) {
        this.connect()
      }
    }, delay)
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnecting = false
    this.reconnectAttempts = 0
    soundService.stopRingtones()
  }

  isConnected() {
    return this.socket?.connected || false
  }
}

// Create singleton instance
const socketService = new SocketService()

export default socketService