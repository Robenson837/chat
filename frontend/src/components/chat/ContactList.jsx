import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { UserPlus, Search, Users, Clock } from 'lucide-react'
import useChatStore from '../../store/chatStore'
import { contactsAPI, buildFileUrl, usersAPI } from '../../services/api'
import LoadingSpinner from '../common/LoadingSpinner'
import toast from 'react-hot-toast'

const ContactList = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)
  const [activeTab, setActiveTab] = useState('contacts') // 'contacts' | 'requests'
  
  const { contacts, setContacts, contactRequests, setContactRequests, setSelectedUser } = useChatStore()

  // Load contacts
  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsAPI.getContacts()
  })

  // Load contact requests
  const { data: contactRequestsData } = useQuery({
    queryKey: ['contact-requests-list'],
    queryFn: () => contactsAPI.getRequests(),
    refetchInterval: 10000 // Refetch every 10 seconds
  })

  // Handle data updates with useEffect
  React.useEffect(() => {
    if (contactsData?.data?.contacts) {
      setContacts(contactsData.data.contacts)
    }
  }, [contactsData, setContacts])

  React.useEffect(() => {
    if (contactRequestsData?.data?.requests) {
      setContactRequests(contactRequestsData.data.requests)
    }
  }, [contactRequestsData, setContactRequests])

  const filteredContacts = contacts.filter(contact =>
    contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  )


  const handleContactClick = (contact) => {
    setSelectedUser(contact._id)
    navigate(`/chat/${contact._id}`)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
          <button
            onClick={() => setShowAddContact(!showAddContact)}
            className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
            title="Add Contact"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Tabs */}
        <div className="flex mt-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'contacts'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'requests'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Requests ({contactRequests.length})
          </button>
        </div>
      </div>

      {/* Add Contact Form */}
      {showAddContact && (
        <AddContactForm onClose={() => setShowAddContact(false)} />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'contacts' ? (
          <ContactsTab contacts={filteredContacts} onContactClick={handleContactClick} />
        ) : (
          <RequestsTab requests={contactRequests} />
        )}
      </div>
    </div>
  )
}

const ContactsTab = ({ contacts, onContactClick }) => {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500">
        <Users className="w-8 h-8 mb-2 text-gray-400" />
        <p className="text-sm">No contacts yet</p>
        <p className="text-xs mt-1">Add contacts to start chatting</p>
      </div>
    )
  }

  return (
    <div>
      {contacts.map((contact) => (
        <ContactItem key={contact._id} contact={contact} onClick={onContactClick} />
      ))}
    </div>
  )
}

const ContactItem = ({ contact, onClick }) => {
  return (
    <div 
      className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
      onClick={() => onClick(contact)}
    >
      <div className="relative mr-3">
        {contact.avatarPath ? (
          <img
            src={buildFileUrl(contact.avatarPath)}
            alt={contact.fullName}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold"
          style={{ display: contact.avatarPath ? 'none' : 'flex' }}
        >
          {contact.fullName.charAt(0).toUpperCase()}
        </div>
        
        {contact.status === 'online' && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">{contact.fullName}</h3>
        <p className="text-sm text-gray-500 truncate">@{contact.username}</p>
      </div>

      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${
          contact.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
        }`}></div>
        <span className="text-xs text-gray-500 capitalize">{contact.status}</span>
      </div>
    </div>
  )
}

const RequestsTab = ({ requests }) => {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-500">
        <Clock className="w-8 h-8 mb-2 text-gray-400" />
        <p className="text-sm">No pending requests</p>
      </div>
    )
  }

  return (
    <div>
      {requests.map((request) => (
        <RequestItem key={request._id} request={request} />
      ))}
    </div>
  )
}

const RequestItem = ({ request }) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleAccept = async () => {
    setIsLoading(true)
    try {
      await contactsAPI.acceptRequest(request.from._id)
      toast.success(`Added ${request.from.fullName} to contacts`)
    } catch (error) {
      toast.error('Failed to accept request')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecline = async () => {
    setIsLoading(true)
    try {
      await contactsAPI.declineRequest(request.from._id)
      toast.success('Request declined')
    } catch (error) {
      toast.error('Failed to decline request')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center mb-2">
        <div className="relative mr-3">
          {request.from.avatarPath ? (
            <img
              src={buildFileUrl(request.from.avatarPath)}
              alt={request.from.fullName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {request.from.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{request.from.fullName}</h3>
          <p className="text-sm text-gray-500 truncate">@{request.from.username}</p>
        </div>
      </div>

      {request.message && (
        <p className="text-sm text-gray-600 mb-3 ml-13">"{request.message}"</p>
      )}

      <div className="flex space-x-2 ml-13">
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={handleDecline}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  )
}

const AddContactForm = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    try {
      const response = await usersAPI.searchUsers(searchTerm)
      setSearchResults(response.data.users)
    } catch (error) {
      toast.error('Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendRequest = async (userId) => {
    try {
      await contactsAPI.sendRequest(userId, `Hi! I'd like to add you as a contact.`)
      toast.success('Contact request sent')
      onClose()
    } catch (error) {
      toast.error('Failed to send request')
    }
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-4">
      <div className="mb-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username or email..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchTerm.trim()}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {isSearching ? <LoadingSpinner size="small" color="white" /> : 'Search'}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {searchResults.map((user) => (
            <div key={user._id} className="flex items-center justify-between bg-white p-2 rounded border">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                </div>
              </div>
              <button
                onClick={() => handleSendRequest(user._id)}
                className="px-3 py-1 bg-primary text-white text-xs font-medium rounded hover:bg-primary-dark transition-colors"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-2 text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </div>
  )
}

export default ContactList