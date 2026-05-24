import React from 'react'
import { Menu, Sun, Moon, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Header({ onMenuToggle }) {
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <header className="h-14 flex items-center gap-4 px-5 bg-white dark:bg-gray-900
                       border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
      <button onClick={onMenuToggle} className="btn-icon lg:hidden">
        <Menu size={18} />
      </button>

      <div className="flex-1">
        <p className="text-xs text-gray-400">
          {getGreeting()}, <span className="font-semibold text-gray-700 dark:text-gray-200">{user?.fullName}</span>
        </p>
      </div>

      {/* Org badge */}
      {user?.orgName && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/30">
          <div className="w-2 h-2 rounded-full bg-primary-500" />
          <span className="text-xs font-medium text-primary-700 dark:text-primary-400 max-w-[180px] truncate">
            {user.orgName}
          </span>
        </div>
      )}

      {/* Theme toggle */}
      <button onClick={toggleTheme} className="btn-icon" title="Toggle theme">
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
  )
}
