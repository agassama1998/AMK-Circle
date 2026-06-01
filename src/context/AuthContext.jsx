import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('amk_user') || 'null') } catch { return null }
  })
  const [token,   setToken]   = useState(() => sessionStorage.getItem('amk_token') || null)
  const [loading, setLoading] = useState(false)

  const login = async (username, password) => {
    setLoading(true)
    try {
      if (!window.api) throw new Error('Desktop API not available — make sure you are running the Electron app, not a browser.')
      const result = await window.api.auth.login({ username, password })
      if (result.success) {
        setUser(result.user)
        setToken(result.token)
        sessionStorage.setItem('amk_user',  JSON.stringify(result.user))
        sessionStorage.setItem('amk_token', result.token)
        return { success: true }
      }
      return { success: false, message: result.message }
    } catch (e) {
      console.error('[login]', e)
      return { success: false, message: e.message || 'Login failed. Please try again.' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (user) {
      await window.api.auth.logout({ userId: user.id, username: user.username, orgId: user.orgId })
    }
    setUser(null)
    setToken(null)
    sessionStorage.removeItem('amk_user')
    sessionStorage.removeItem('amk_token')
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    setUser(updated)
    sessionStorage.setItem('amk_user', JSON.stringify(updated))
  }

  // ─── Role flags ─────────────────────────────────────────────────────────────
  const isSuperAdmin  = user?.role === 'super_admin'
  const isOrgAdmin    = user?.role === 'organization_admin'
  const isTeacher     = user?.role === 'teacher'
  const isImam        = user?.role === 'imam'
  const isFinance     = user?.role === 'finance'
  const isPrincipal   = user?.role === 'principal'
  const isParent      = user?.role === 'parent'
  const isStudent     = user?.role === 'student'

  // Read-only roles — cannot create / edit / delete anything
  const isReadOnly    = isParent || isStudent

  // ─── Capability flags ────────────────────────────────────────────────────────
  const canManageOrg      = isSuperAdmin || isOrgAdmin || isPrincipal
  const canManageFinance  = isSuperAdmin || isOrgAdmin || isFinance
  const canManageMasjid   = isSuperAdmin || isOrgAdmin || isImam
  const canManageStudents = isSuperAdmin || isOrgAdmin || isTeacher || isPrincipal
  // Only super_admin and organization_admin may activate / deactivate / delete / restore users
  const canManageStatus   = isSuperAdmin || isOrgAdmin

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout, updateUser,
      // Role flags
      isSuperAdmin, isOrgAdmin, isTeacher, isImam, isFinance, isPrincipal,
      isParent, isStudent, isReadOnly,
      // Capability flags
      canManageOrg, canManageFinance, canManageMasjid, canManageStudents, canManageStatus,
      orgId: user?.orgId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
