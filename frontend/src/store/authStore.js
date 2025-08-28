import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      
      // Actions
      setAuth: (data) => {
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        })
      },
      
      setUser: (user) => {
        set({ user })
      },
      
      updateTokens: (tokens) => {
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
      },
      
      setLoading: (isLoading) => {
        set({ isLoading })
      },
      
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
        // Clear persisted state
        localStorage.removeItem('vigi-auth')
      },
      
      // Getters
      getToken: () => get().accessToken,
      getUser: () => get().user,
      getUserId: () => get().user?._id,
    }),
    {
      name: 'vigi-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore