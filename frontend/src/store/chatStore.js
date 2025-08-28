import { create } from 'zustand'

const useChatStore = create((set, get) => ({
  // State
  conversations: [],
  currentConversation: null,
  messages: {},
  onlineUsers: new Set(),
  typingUsers: {},
  unreadCounts: {},
  contacts: [],
  contactRequests: [],
  
  // UI State
  selectedUserId: null,
  isChatListOpen: true,
  searchQuery: '',
  
  // Actions - Conversations
  setConversations: (conversations) => {
    set({ conversations })
  },
  
  addConversation: (conversation) => {
    const { conversations } = get()
    const existingIndex = conversations.findIndex(c => c.conversationId === conversation.conversationId)
    
    if (existingIndex !== -1) {
      // Update existing conversation
      const updated = [...conversations]
      updated[existingIndex] = conversation
      set({ conversations: updated })
    } else {
      // Add new conversation
      set({ conversations: [conversation, ...conversations] })
    }
  },
  
  updateConversationLastMessage: (conversationId, message) => {
    const { conversations } = get()
    const updated = conversations.map(conv => {
      if (conv.conversationId === conversationId) {
        return {
          ...conv,
          lastMessage: {
            _id: message._id,
            content: message.content,
            createdAt: message.createdAt,
            status: message.status,
            sender: message.sender._id || message.sender
          }
        }
      }
      return conv
    })
    set({ conversations: updated })
  },
  
  // Actions - Messages
  setMessages: (conversationId, messages) => {
    const { messages: allMessages } = get()
    set({
      messages: {
        ...allMessages,
        [conversationId]: messages
      }
    })
  },
  
  addMessage: (conversationId, message) => {
    const { messages: allMessages } = get()
    const conversationMessages = allMessages[conversationId] || []
    
    // Check if message already exists
    const exists = conversationMessages.some(m => m._id === message._id)
    if (!exists) {
      set({
        messages: {
          ...allMessages,
          [conversationId]: [...conversationMessages, message]
        }
      })
    }
  },
  
  prependMessages: (conversationId, newMessages) => {
    const { messages: allMessages } = get()
    const existingMessages = allMessages[conversationId] || []
    
    // Remove duplicates and prepend new messages
    const existingIds = new Set(existingMessages.map(m => m._id))
    const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m._id))
    
    set({
      messages: {
        ...allMessages,
        [conversationId]: [...uniqueNewMessages, ...existingMessages]
      }
    })
  },
  
  updateMessageStatus: (conversationId, messageId, status, timestamp) => {
    const { messages: allMessages } = get()
    const conversationMessages = allMessages[conversationId] || []
    
    const updated = conversationMessages.map(message => {
      if (message._id === messageId) {
        const updatedMessage = { ...message, status }
        if (status === 'delivered' && timestamp) {
          updatedMessage.deliveredAt = timestamp
        }
        if (status === 'read' && timestamp) {
          updatedMessage.readAt = timestamp
        }
        return updatedMessage
      }
      return message
    })
    
    set({
      messages: {
        ...allMessages,
        [conversationId]: updated
      }
    })
  },
  
  removeMessage: (conversationId, messageId) => {
    const { messages: allMessages } = get()
    const conversationMessages = allMessages[conversationId] || []
    
    set({
      messages: {
        ...allMessages,
        [conversationId]: conversationMessages.filter(m => m._id !== messageId)
      }
    })
  },
  
  updateMessage: (conversationId, messageId, updates) => {
    const { messages: allMessages } = get()
    const conversationMessages = allMessages[conversationId] || []
    
    const updated = conversationMessages.map(message => {
      if (message._id === messageId) {
        return { ...message, ...updates }
      }
      return message
    })
    
    set({
      messages: {
        ...allMessages,
        [conversationId]: updated
      }
    })
  },
  
  // Actions - Online Users & Typing
  setOnlineUsers: (users) => {
    set({ onlineUsers: new Set(users.map(u => u.userId)) })
  },
  
  addOnlineUser: (userId) => {
    const { onlineUsers } = get()
    const updated = new Set(onlineUsers)
    updated.add(userId)
    set({ onlineUsers: updated })
  },
  
  removeOnlineUser: (userId) => {
    const { onlineUsers } = get()
    const updated = new Set(onlineUsers)
    updated.delete(userId)
    set({ onlineUsers: updated })
  },
  
  setTypingUser: (conversationId, userId, isTyping) => {
    const { typingUsers } = get()
    const conversationTyping = typingUsers[conversationId] || {}
    
    if (isTyping) {
      conversationTyping[userId] = Date.now()
    } else {
      delete conversationTyping[userId]
    }
    
    set({
      typingUsers: {
        ...typingUsers,
        [conversationId]: conversationTyping
      }
    })
  },
  
  // Actions - Unread Counts
  setUnreadCount: (conversationId, count) => {
    const { unreadCounts } = get()
    set({
      unreadCounts: {
        ...unreadCounts,
        [conversationId]: count
      }
    })
  },
  
  clearUnreadCount: (conversationId) => {
    const { unreadCounts } = get()
    const updated = { ...unreadCounts }
    delete updated[conversationId]
    set({ unreadCounts: updated })
  },
  
  // Actions - Contacts
  setContacts: (contacts) => {
    set({ contacts })
  },
  
  addContact: (contact) => {
    const { contacts } = get()
    const exists = contacts.some(c => c._id === contact._id)
    if (!exists) {
      set({ contacts: [...contacts, contact] })
    }
  },
  
  removeContact: (contactId) => {
    const { contacts } = get()
    set({ contacts: contacts.filter(c => c._id !== contactId) })
  },
  
  updateContactStatus: (userId, status, lastSeen) => {
    const { contacts } = get()
    const updated = contacts.map(contact => {
      if (contact._id === userId) {
        return { ...contact, status, lastSeen }
      }
      return contact
    })
    set({ contacts: updated })
  },
  
  // Actions - Contact Requests
  setContactRequests: (requests) => {
    set({ contactRequests: requests })
  },
  
  addContactRequest: (request) => {
    const { contactRequests } = get()
    const exists = contactRequests.some(r => r.from._id === request.from._id)
    if (!exists) {
      set({ contactRequests: [request, ...contactRequests] })
    }
  },
  
  removeContactRequest: (fromUserId) => {
    const { contactRequests } = get()
    set({ contactRequests: contactRequests.filter(r => r.from._id !== fromUserId) })
  },
  
  // Actions - UI
  setSelectedUser: (userId) => {
    set({ 
      selectedUserId: userId,
      currentConversation: userId ? `conversation_${userId}` : null
    })
  },
  
  toggleChatList: () => {
    const { isChatListOpen } = get()
    set({ isChatListOpen: !isChatListOpen })
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },
  
  // Getters
  getMessages: (conversationId) => {
    const { messages } = get()
    return messages[conversationId] || []
  },
  
  getTotalUnreadCount: () => {
    const { unreadCounts } = get()
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
  },
  
  isUserOnline: (userId) => {
    const { onlineUsers } = get()
    return onlineUsers.has(userId)
  },
  
  isUserTyping: (conversationId, userId) => {
    const { typingUsers } = get()
    const conversationTyping = typingUsers[conversationId] || {}
    const lastTyping = conversationTyping[userId]
    
    if (!lastTyping) return false
    
    // Consider user stopped typing after 3 seconds
    return Date.now() - lastTyping < 3000
  },
  
  getFilteredConversations: () => {
    const { conversations, searchQuery } = get()
    
    if (!searchQuery.trim()) {
      return conversations
    }
    
    const query = searchQuery.toLowerCase()
    return conversations.filter(conv => 
      conv.otherUser.fullName.toLowerCase().includes(query) ||
      conv.otherUser.username.toLowerCase().includes(query) ||
      (conv.lastMessage?.content?.text && 
       conv.lastMessage.content.text.toLowerCase().includes(query))
    )
  },
  
  // Reset store
  reset: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: {},
      onlineUsers: new Set(),
      typingUsers: {},
      unreadCounts: {},
      contacts: [],
      contactRequests: [],
      selectedUserId: null,
      isChatListOpen: true,
      searchQuery: '',
    })
  },
}))

export default useChatStore