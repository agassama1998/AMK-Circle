const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { dbGet, dbRun, audit } = require('../database/db')

const JWT_SECRET = 'amkcircle-jwt-secret-2024-change-in-production'
const JWT_EXPIRES = '24h'

module.exports = {
  'auth:login': async (_, { username, password }) => {
    try {
      if (!username || !password)
        return { success: false, message: 'Username and password are required' }

      // Find user (allow null organization_id for super_admin)
      const user = dbGet(
        `SELECT u.*, o.name as org_name, o.slug as org_slug, o.primary_color, o.secondary_color,
                o.logo as org_logo, o.org_type, o.is_active as org_active
         FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.username = ? AND u.is_active = 1`,
        username
      )

      if (!user) return { success: false, message: 'Invalid username or password' }

      // Check org is active (skip for super_admin)
      if (user.role !== 'super_admin' && user.org_active === 0)
        return { success: false, message: 'Your organization is currently inactive. Please contact support.' }

      const match = await bcrypt.compare(password, user.password_hash)
      if (!match) return { success: false, message: 'Invalid username or password' }

      // Update last login
      dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', user.id)

      // Audit log
      audit(user.organization_id, user.id, user.username, 'LOGIN', 'users', user.id, { role: user.role })

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, orgId: user.organization_id, role: user.role, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      )

      return {
        success: true,
        token,
        user: {
          id:          user.id,
          username:    user.username,
          email:       user.email,
          fullName:    user.full_name,
          role:        user.role,
          orgId:       user.organization_id,
          orgName:     user.org_name,
          orgSlug:     user.org_slug,
          orgType:     user.org_type,
          orgLogo:     user.org_logo,
          primaryColor:   user.primary_color,
          secondaryColor: user.secondary_color,
        },
      }
    } catch (e) {
      console.error('[auth:login]', e)
      return { success: false, message: e.message }
    }
  },

  'auth:logout': async (_, { userId, username, orgId }) => {
    try {
      audit(orgId, userId, username, 'LOGOUT', 'users', userId, null)
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  'auth:changePassword': async (_, { token, currentPassword, newPassword }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      const user    = dbGet('SELECT * FROM users WHERE id = ?', decoded.userId)
      if (!user) return { success: false, message: 'User not found' }

      const match = await bcrypt.compare(currentPassword, user.password_hash)
      if (!match) return { success: false, message: 'Current password is incorrect' }

      if (newPassword.length < 8)
        return { success: false, message: 'New password must be at least 8 characters' }

      const hash = await bcrypt.hash(newPassword, 10)
      dbRun('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', hash, user.id)
      audit(user.organization_id, user.id, user.username, 'CHANGE_PASSWORD', 'users', user.id, null)

      return { success: true, message: 'Password changed successfully' }
    } catch (e) {
      return { success: false, message: e.message }
    }
  },

  'auth:getMe': async (_, { token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      const user    = dbGet(
        `SELECT u.*, o.name as org_name, o.slug as org_slug, o.primary_color, o.secondary_color, o.org_type, o.logo as org_logo
         FROM users u LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.id = ? AND u.is_active = 1`,
        decoded.userId
      )
      if (!user) return { success: false }
      return {
        success: true,
        user: {
          id:          user.id,
          username:    user.username,
          email:       user.email,
          fullName:    user.full_name,
          role:        user.role,
          orgId:       user.organization_id,
          orgName:     user.org_name,
          orgSlug:     user.org_slug,
          orgType:     user.org_type,
          orgLogo:     user.org_logo,
          primaryColor:   user.primary_color,
          secondaryColor: user.secondary_color,
        },
      }
    } catch (e) {
      return { success: false }
    }
  },
}
