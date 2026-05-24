import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, GraduationCap, BookOpen,
  Calendar, Wallet, BarChart3, Settings, LogOut, ChevronDown,
  Landmark, Star, Heart, Shield, UserCheck, Menu, X, BookMarked,
  Bed, DollarSign, ClipboardList, Bell, Globe, Home
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ─── Nav items config ─────────────────────────────────────────────────────────
const SUPER_NAV = [
  { label: 'Platform', items: [
    { to: '/super',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/super/organizations', icon: Building2,       label: 'Organizations' },
    { to: '/super/audit-logs',   icon: ClipboardList,   label: 'Audit Logs' },
  ]},
]

function getOrgNav(role) {
  const isAdmin    = ['organization_admin','super_admin','principal'].includes(role)
  const isImam     = ['imam','organization_admin','super_admin'].includes(role)
  const isFinance  = ['finance','organization_admin','super_admin'].includes(role)
  const isTeacher  = ['teacher','organization_admin','super_admin','principal'].includes(role)

  const nav = []

  nav.push({ label: 'Overview', items: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  ]})

  nav.push({ label: 'Masjid', items: [
    { to: '/masjid', icon: Landmark, label: 'Masjid Management' },
  ]})

  nav.push({ label: 'School', items: [
    { to: '/school/students',   icon: Users,       label: 'Students' },
    { to: '/school/teachers',   icon: UserCheck,   label: 'Teachers' },
    { to: '/school/classes',    icon: BookOpen,    label: 'Classes' },
    { to: '/school/attendance', icon: ClipboardList, label: 'Attendance' },
  ]})

  nav.push({ label: 'Dara / Hifz', items: [
    { to: '/dara/hifz',    icon: BookMarked, label: 'Hifz Tracking' },
    { to: '/dara/boarding', icon: Bed,        label: 'Boarding' },
  ]})

  nav.push({ label: 'Finance', items: [
    { to: '/finance',          icon: Wallet,       label: 'Payments' },
    { to: '/finance/expenses', icon: DollarSign,   label: 'Expenses' },
    { to: '/finance/salaries', icon: Heart,        label: 'Salaries' },
  ]})

  nav.push({ label: 'Reports', items: [
    { to: '/reports', icon: BarChart3, label: 'Analytics & Reports' },
  ]})

  if (isAdmin) {
    nav.push({ label: 'Admin', items: [
      { to: '/users',    icon: Shield,   label: 'Users & Roles' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]})
  }

  return nav
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToggle }) {
  const { user, isSuperAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const navGroups = isSuperAdmin ? SUPER_NAV : getOrgNav(user?.role)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className={`
      flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800
      transition-all duration-300 flex-shrink-0
      ${collapsed ? 'sidebar-w-min' : 'sidebar-w'}
    `}>
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center flex-shrink-0">
          <Star size={18} className="text-gold-400" fill="currentColor" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm text-primary-800 dark:text-primary-300 leading-tight">AMK Circle</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.orgName || 'Platform Admin'}</p>
          </div>
        )}
        <button onClick={onToggle} className="ml-auto btn-icon flex-shrink-0">
          {collapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && <p className="nav-group-label">{group.label}</p>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-gray-400 capitalize truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
          <button onClick={handleLogout} className="btn-icon flex-shrink-0" title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
