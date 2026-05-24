import React from 'react'

export default function StatsCard({ icon: Icon, label, value, sub, color = 'primary', trend }) {
  const colors = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400',
    gold:    'bg-gold-50   dark:bg-gold-900/20   text-gold-700   dark:text-gold-400',
    blue:    'bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-400',
    red:     'bg-red-50    dark:bg-red-900/20    text-red-700    dark:text-red-400',
    purple:  'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
    green:   'bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-400',
  }

  return (
    <div className="stats-card">
      <div className={`stats-icon ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  )
}
