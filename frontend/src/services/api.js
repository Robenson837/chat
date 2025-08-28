import axios from 'axios'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const { refreshToken, updateTokens, logout } = useAuthStore.getState()
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          })
          
          const { accessToken, refreshToken: newRefreshToken } = response.data
          updateTokens({ accessToken, refreshToken: newRefreshToken })
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, logout user
          logout()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        logout()
        window.location.href = '/login'
      }
    }
    
    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.')
      return Promise.reject(new Error('Network error'))
    }
    
    // Handle other errors
    const message = error.response?.data?.error || 'Something went wrong'
    if (error.response?.status !== 401) {
      toast.error(message)
    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  verify: () => api.get('/auth/verify'),
}

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.patch('/users/me', data),
  searchUsers: (query, page = 1, limit = 20) => 
    api.get(`/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
  getUserById: (userId) => api.get(`/users/${userId}`),
  blockUser: (userId) => api.patch(`/users/${userId}/block`, { action: 'block' }),
  unblockUser: (userId) => api.patch(`/users/${userId}/block`, { action: 'unblock' }),
  getBlockedUsers: () => api.get('/users/blocked/list'),
}

// Messages API
export const messagesAPI = {
  sendMessage: (data) => api.post('/messages', data),
  getConversation: (userId, page = 1, limit = 50) => 
    api.get(`/messages/conversation/${userId}?page=${page}&limit=${limit}`),
  markAsRead: (userId) => api.patch(`/messages/conversation/${userId}/read`),
  getConversations: (page = 1, limit = 20) => 
    api.get(`/messages/conversations?page=${page}&limit=${limit}`),
  searchMessages: (userId, query, page = 1, limit = 20) => 
    api.get(`/messages/conversation/${userId}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  editMessage: (messageId, content) => api.patch(`/messages/${messageId}`, { content }),
}

// Contacts API
export const contactsAPI = {
  getContacts: (status, search) => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (search) params.append('search', search)
    return api.get(`/contacts?${params.toString()}`)
  },
  sendRequest: (userId, message) => api.post('/contacts/request', { userId, message }),
  acceptRequest: (userId) => api.post('/contacts/accept', { userId }),
  declineRequest: (userId) => api.post('/contacts/decline', { userId }),
  removeContact: (userId) => api.delete(`/contacts/${userId}`),
  getRequests: () => api.get('/contacts/requests'),
  getSentRequests: () => api.get('/contacts/requests/sent'),
  cancelRequest: (userId) => api.delete(`/contacts/requests/sent/${userId}`),
}

// Upload API
export const uploadAPI = {
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  uploadAttachments: (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('attachments', file))
    return api.post('/upload/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  deleteFile: (type, filename) => api.delete(`/upload/${type}/${filename}`),
  
  getFileInfo: (type, filename) => api.get(`/upload/info/${type}/${filename}`),
  
  getConfig: () => api.get('/upload/config'),
}

// Utility functions
export const buildFileUrl = (path) => {
  if (!path) return null
  
  // If it's already a full URL, convert it to use the proxy
  if (path.startsWith('http://localhost:3001')) {
    return path.replace('http://localhost:3001', 'http://localhost:3000')
  }
  
  // If it's already a full URL with different host, return as is
  if (path.startsWith('http')) return path
  
  // For relative paths, use the proxy URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'
  return `${baseUrl}${path}`
}

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default api