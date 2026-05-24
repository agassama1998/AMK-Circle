import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Star, Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login, loading } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.password) { setError('Please enter username and password'); return }
    try {
      const result = await login(form.username, form.password)
      if (!result.success) setError(result.message || 'Login failed')
    } catch (err) {
      setError(err.message || 'An unexpected error occurred')
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 islamic-accent p-4">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-primary-600 via-gold-500 to-primary-600" />

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-700 rounded-2xl mb-4 shadow-lg">
                <Star size={28} className="text-gold-400" fill="currentColor" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AMK Circle</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Islamic Community Management Platform
              </p>
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5">amkcircle.com</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input pl-9"
                    placeholder="Enter your username"
                    value={form.username}
                    onChange={set('username')}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input pl-9 pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={set('password')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm animate-slide-in">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-base mt-2">
                {loading ? (
                  <><span className="spinner w-4 h-4" /> Signing in...</>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Demo Credentials</p>
              {[
                { role: 'Super Admin',   user: 'superadmin',  pass: 'Admin@123!' },
                { role: 'IECC Admin',    user: 'iecc_admin',  pass: 'Admin@123!' },
                { role: 'Teacher',       user: 'teacher1',    pass: 'Teacher@123!' },
                { role: 'Finance',       user: 'finance1',    pass: 'Finance@123!' },
              ].map(({ role, user, pass }) => (
                <button
                  key={user}
                  type="button"
                  onClick={() => { setForm({ username: user, password: pass }); setError('') }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white dark:hover:bg-gray-700/60 transition-colors group"
                >
                  <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">{role}</span>
                  <span className="text-xs text-gray-400 ml-2">{user}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          © 2024 AMK Circle · amkcircle.com
        </p>
      </div>
    </div>
  )
}
