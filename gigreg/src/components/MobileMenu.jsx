import React, { useState, useEffect } from 'react'
import { Home, Search, User, LogIn, MessageCircle, Clock, Plus, Heart, CircleUserRound, MessageSquare, UserRound } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

const MobileMenu = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo } = useSelector((state) => state.auth)
  const { chatUnread } = useSelector((state) => state.chat || { chatUnread: 0 })
  const isLoggedIn = !!userInfo


  const getActiveClass = (path) => {
    const isActive = location.pathname === path
    return isActive 
      ? 'text-primary' 
      : 'text-gray-600 hover:text-gray-800'
  }

  const navigationItems = isLoggedIn 
    ? [
        { label: 'Build', icon: Search, path: '/', className: getActiveClass('/') },
        { label: 'Favorites', icon: Heart, path: '/profile?tab=Bookmarks', className: getActiveClass('/profile?tab=Bookmarks') },
        { label: 'Create', icon: Plus, path: '/create-listing', className: getActiveClass('/create-listing') },
        { label: 'Messages', icon: MessageSquare, path: '/chat', className: getActiveClass('/chat') },
        { label: 'Profile', icon: User, path: '/profile', className: getActiveClass('/profile') },
      ]
    : [
        { label: 'Build', icon: Home, path: '/', className: getActiveClass('/') },
        { label: 'Log in', icon: LogIn, path: '/login', className: getActiveClass('/login') },
      ]

  return (
    <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50`}>
      <div className='flex justify-between items-center px-2 py-2'>
        {isLoggedIn ? (
          navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors relative ${item.className}`}
              title={item.label}
            >
              <item.icon strokeWidth={2.5} size={20} />
              {item.label === 'Messages' && chatUnread > 0 && (
                <span className="absolute -top-1 right-4 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-semibold">
                  {chatUnread > 99 ? "99+" : chatUnread || 0}
                </span>
              )}
              <span className='text-xs font-medium'>{item.label}</span>
            </button>
          ))
        ) : (
          <>
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${item.className}`}
                title={item.label}
              >
                <item.icon size={20} />
                <span className='text-xs font-medium'>{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => navigate('/login')}
              className={`flex flex-col items-center gap-1 px-3 py-2 ${getActiveClass('/login')} hover:text-primary/80 transition-colors`}
              title='Login'
            >
              <LogIn size={20} />
              <span className='text-xs font-medium'>Login</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default MobileMenu
