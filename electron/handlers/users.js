const bcrypt = require('bcryptjs')
const { dbGet, dbAll, dbRun, audit } = require('../database/db')

module.exports = {
  'users:getAll': async (_, { orgId, role, search } = {}) => {
    try {
      let q = `SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.last_login, u.created_at,
                      o.name as org_name
               FROM users u LEFT JOIN organizations o ON u.organization_id = o.id
               WHERE u.organization_id = ?`
      const params = [orgId]
      if (role)   { q += ' AND u.role = ?';           params.push(role) }
      if (search) { q += ' AND (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      q += ' ORDER BY u.full_name'
      return { success: true, data: dbAll(q, params) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'users:create': async (_, { orgId, username, email, fullName, role, password, phone }) => {
    try {
      const existing = dbGet('SELECT id FROM users WHERE organization_id=? AND username=?', orgId, username)
      if (existing) return { success: false, message: 'Username already exists' }
      const emailExists = dbGet('SELECT id FROM users WHERE organization_id=? AND email=?', orgId, email)
      if (emailExists) return { success: false, message: 'Email already in use' }

      const hash = await bcrypt.hash(password || 'Welcome@123!', 10)
      const result = dbRun(`
        INSERT INTO users (organization_id, username, email, password_hash, full_name, role, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, orgId, username, email, hash, fullName, role || 'teacher', phone || null)

      audit(orgId, null, 'admin', 'CREATE_USER', 'users', result.lastInsertRowid, { username, role })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'users:update': async (_, { id, orgId, email, fullName, role, phone, isActive }) => {
    try {
      dbRun(`
        UPDATE users SET email=?, full_name=?, role=?, phone=?, is_active=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND organization_id=?
      `, email, fullName, role, phone||null, isActive !== undefined ? (isActive ? 1 : 0) : 1, id, orgId)
      audit(orgId, null, 'admin', 'UPDATE_USER', 'users', id, { fullName, role })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'users:delete': async (_, { id, orgId }) => {
    try {
      dbRun('UPDATE users SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?', id, orgId)
      audit(orgId, null, 'admin', 'DELETE_USER', 'users', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'users:resetPassword': async (_, { id, orgId, newPassword }) => {
    try {
      const hash = await bcrypt.hash(newPassword || 'Welcome@123!', 10)
      dbRun('UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?', hash, id, orgId)
      audit(orgId, null, 'admin', 'RESET_PASSWORD', 'users', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
