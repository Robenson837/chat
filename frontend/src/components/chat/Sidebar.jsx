import React, { useState } from 'react'
import { Search, MessageCircle, Users, Settings, Phone, LogOut } from 'lucide-react'
import useChatStore from '../../store/chatStore'
import useAuthStore from '../../store/authStore'
import { buildFileUrl } from '../../services/api'
import ContactList from './ContactList'
import ConversationList from './ConversationList'

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('chats') // 'chats' | 'contacts'
  const { searchQuery, setSearchQuery } = useChatStore()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Vigi</h1>
          <div className="flex items-center space-x-2">
            <button 
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative">
            {user?.avatarPath ? (
              <img
                src={buildFileUrl(user.avatarPath)}
                alt={user.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-500">Online</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chats'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Chats
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'contacts'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Contacts
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chats' ? <ConversationList /> : <ContactList />}
      </div>
    </div>
  )
}

export default Sidebar