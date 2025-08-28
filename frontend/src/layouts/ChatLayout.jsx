import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import useChatStore from '../store/chatStore'
import { contactsAPI, messagesAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

// Components
import Sidebar from '../components/chat/Sidebar'
import ChatArea from '../components/chat/ChatArea'
import WelcomeScreen from '../components/chat/WelcomeScreen'

const ChatLayout = () => {
  const { isAuthenticated, user } = useAuthStore()
  const { selectedUserId, setContacts, setContactRequests, setConversations } = useChatStore()

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Load initial data
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsAPI.getContacts(),
    retry: 1,
    enabled: isAuthenticated && !!user
  })

  const { data: contactRequestsData } = useQuery({
    queryKey: ['contact-requests-list'],
    queryFn: () => contactsAPI.getRequests(),
    retry: 1,
    enabled: isAuthenticated && !!user,
    refetchInterval: 10000 // Refetch every 10 seconds
  })

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesAPI.getConversations(),
    retry: 1,
    enabled: isAuthenticated && !!user
  })

  // Handle data updates with useEffect
  useEffect(() => {
    if (contactsData?.data?.contacts) {
      setContacts(contactsData.data.contacts)
    }
  }, [contactsData, setContacts])

  useEffect(() => {
    if (contactRequestsData?.data?.requests) {
      setContactRequests(contactRequestsData.data.requests)
    }
  }, [contactRequestsData, setContactRequests])

  useEffect(() => {
    if (conversationsData?.data?.conversations) {
      setConversations(conversationsData.data.conversations)
    }
  }, [conversationsData, setConversations])

  // Show loading while initial data is loading
  if (contactsLoading || conversationsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading your chats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route
            path="/"
            element={
              selectedUserId ? <ChatArea /> : <WelcomeScreen />
            }
          />
          <Route
            path="/chat/:userId"
            element={<ChatArea />}
          />
        </Routes>
      </div>
    </div>
  )
}

export default ChatLayout