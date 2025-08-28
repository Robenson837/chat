import React from 'react'
import { clsx } from 'clsx'

const LoadingSpinner = ({ 
  size = 'medium',
  color = 'primary',
  className,
  ...props 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-6 h-6 border-2',
    large: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4'
  }

  const colorClasses = {
    primary: 'border-primary-200 border-t-primary',
    white: 'border-gray-300 border-t-white',
    gray: 'border-gray-200 border-t-gray-500'
  }

  return (
    <div
      className={clsx(
        'animate-spin rounded-full',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      {...props}
    />
  )
}

export default LoadingSpinner