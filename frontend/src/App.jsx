import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from './store/authStore'
import useChatStore from './store/chatStore'
import useCallStore from './store/callStore'
import socketService from './services/socket'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import ChatLayout from './layouts/ChatLayout'
import LoadingSpinner from './components/common/LoadingSpinner'
import CallModal from './components/call/CallModal'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, accessToken, isLoading } = useAuthStore()
  const { reset: resetChat } = useChatStore()
  const { reset: resetCall } = useCallStore()

  useEffect(() => {
    if (isAuthenticated && accessToken && user) {
      // User is authenticated, connect socket if not already connected
      if (!socketService.isConnected()) {
        console.log('Connecting to socket...')
        socketService.connect()
      }
      
      // If user is on login/register page, redirect to chat
      if (location.pathname === '/login' || location.pathname === '/register') {
        console.log('User authenticated, redirecting to chat')
        navigate('/', { replace: true })
      }
    } else if (!isAuthenticated) {
      // User is not authenticated
      socketService.disconnect()
      resetChat()
      resetCall()
      
      // If user is on protected route, redirect to login
      if (location.pathname !== '/login' && location.pathname !== '/register') {
        console.log('User not authenticated, redirecting to login')
        navigate('/login', { replace: true })
      }
    }
  }, [isAuthenticated, accessToken, user, location.pathname, navigate, resetChat, resetCall])

  // Show loading spinner only during auth operations
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="/*" element={<ChatLayout />} />
      </Routes>
      
      {/* Call Modal - shown globally when in a call */}
      <CallModal />
    </div>
  )
}

export default App