import React from 'react'
import { MessageCircle, Phone, Video, Users, Shield } from 'lucide-react'

const WelcomeScreen = () => {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10 text-white" />
        </div>
        
        {/* Welcome Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Vigi</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Connect with your contacts through secure messaging, voice calls, and video calls. 
          Select a conversation from the sidebar to start chatting.
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <MessageCircle className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Instant Messaging</p>
            <p className="text-xs text-gray-500 mt-1">Real-time text messages</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <Phone className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Voice Calls</p>
            <p className="text-xs text-gray-500 mt-1">Crystal clear audio</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <Video className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Video Calls</p>
            <p className="text-xs text-gray-500 mt-1">Face-to-face conversations</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Secure</p>
            <p className="text-xs text-gray-500 mt-1">End-to-end encryption</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <div className="text-sm text-gray-500 mb-4">Get started:</div>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Add contacts</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Start chatting</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen