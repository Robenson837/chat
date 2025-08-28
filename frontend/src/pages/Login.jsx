import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import useAuthStore from '../store/authStore'
import { authAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

const schema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .required('Password is required'),
})

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  })

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data
      setAuth({ user, accessToken, refreshToken })
      toast.success(`Welcome back, ${user.fullName}!`)
      navigate('/', { replace: true })
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Login failed'
      toast.error(message)
    },
  })

  const onSubmit = (data) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary text-white">
            <MessageCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to Vigi
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to start messaging
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`input-primary ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input-primary pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full flex justify-center py-3 text-base"
            >
              {loginMutation.isPending ? (
                <LoadingSpinner size="small" color="white" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Create one here
              </Link>
            </p>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials</h3>
          <div className="space-y-1 text-xs text-gray-600">
            <p><strong>User 1:</strong> test@example.com</p>
            <p><strong>User 2:</strong> robensoninnocent12@gmail.com</p>
            <p><strong>User 3:</strong> testuser@example.com</p>
            <p><strong>Password:</strong> demo123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login