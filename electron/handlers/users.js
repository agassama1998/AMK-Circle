const bcrypt = require('bcryptjs')
const { dbGet, dbAll, dbRun, audit } = require('../database/db')

// ─── Permission helpers ───────────────────────────────────────────────────────

const STATUS_MANAGERS = ['super_admin', 'organization_admin']

/**
 * Returns an error string if the actor may not manage users in targetOrgId.
 * Returns null when the operation is permitted.
 *   - super_admin  → full access across all orgs
 *   - organization_admin → only within their own org
 *   - everyone else → denied
 */
function assertPermission(actorRole, actorOrgId, targetOrgId) {
  if (!STATUS_MANAGERS.includes(actorRole))
    return 'Permission denied: insufficient role'
  if (actorRole === 'organization_admin' && String(actorOrgId) !== String(targetOrgId))
    return 'Access denied: cross-tenant operation not permitted'
  return null
}

// ─── Handlers ─────────────────────────────────────────────────────────────────
module.exports = {

  // ── List users ───────────────────────────────────────────────────────────────
  /**
   * status param:
   *   'active'   → only active, non-deleted users
   *   'inactive' → only inactive, non-deleted users
   *   'deleted'  → only soft-deleted users
   *   (omitted)  → all non-deleted users
   * includeDeleted: true → include deleted rows regardless of status
   */
  'users:getAll': async (_, { orgId, role, search, status, includeDeleted } = {}) => {
    try {
      let q = `
        SELECT u.id, u.username, u.email, u.full_name, u.role,
               u.is_active, u.status, u.phone, u.last_login, u.created_at,
               u.deleted_at, u.deleted_by,
               o.name as org_name
        FROM   users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE  u.organization_id = ?`
      const params = [orgId]

      if (status === 'deleted') {
        // Show only soft-deleted rows
        q += ' AND u.deleted_at IS NOT NULL'
      } else if (includeDeleted) {
        // Show everything — no extra filter
      } else {
        // Default: hide soft-deleted rows
        q += ' AND u.deleted_at IS NULL'
      }

      // Status filter (only meaningful when not filtering by 'deleted')
      if (status && status !== 'deleted') {
        q += ' AND u.status = ?'
        params.push(status)
      }

      if (role) { q += ' AND u.role = ?'; params.push(role) }
      if (search) {
        q += ' AND (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
      }

      q += ' ORDER BY u.full_name'
      return { success: true, data: dbAll(q, params) }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Create user ──────────────────────────────────────────────────────────────
  'users:create': async (_, { orgId, username, email, fullName, role, password, phone }) => {
    try {
      const existing = dbGet(
        'SELECT id FROM users WHERE organization_id=? AND username=?',
        orgId, username,
      )
      if (existing) return { success: false, message: 'Username already exists in this organization' }

      const emailExists = dbGet(
        'SELECT id FROM users WHERE organization_id=? AND email=?',
        orgId, email,
      )
      if (emailExists) return { success: false, message: 'Email already in use in this organization' }

      const hash   = await bcrypt.hash(password || 'Welcome@123!', 10)
      const result = dbRun(`
        INSERT INTO users
          (organization_id, username, email, password_hash, full_name, role, phone, is_active, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'active')
      `, orgId, username, email, hash, fullName, role || 'teacher', phone || null)

      audit(orgId, null, 'admin', 'USER_CREATED', 'users', result.lastInsertRowid, { username, role })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Edit user profile ────────────────────────────────────────────────────────
  'users:update': async (_, { id, orgId, email, fullName, role, phone, isActive }) => {
    try {
      const activeInt  = isActive !== undefined ? (isActive ? 1 : 0) : 1
      const statusText = activeInt === 1 ? 'active' : 'inactive'
      dbRun(`
        UPDATE users
        SET    email=?, full_name=?, role=?, phone=?, is_active=?, status=?,
               updated_at=CURRENT_TIMESTAMP
        WHERE  id=? AND organization_id=?
      `, email, fullName, role, phone || null, activeInt, statusText, id, orgId)
      audit(orgId, null, 'admin', 'UPDATE_USER', 'users', id, { fullName, role })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Activate / Deactivate — RBAC-enforced ────────────────────────────────────
  'users:updateStatus': async (_, { id, orgId, status, actorRole, actorOrgId }) => {
    try {
      const err = assertPermission(actorRole, actorOrgId, orgId)
      if (err) return { success: false, message: err }

      const valid = ['active', 'inactive']
      if (!valid.includes(status))
        return { success: false, message: `Invalid status. Allowed: ${valid.join(', ')}` }

      const current = dbGet(
        'SELECT status, is_active, full_name, deleted_at FROM users WHERE id=? AND organization_id=?',
        id, orgId,
      )
      if (!current) return { success: false, message: 'User not found' }
      if (current.deleted_at)
        return { success: false, message: 'User is deleted. Restore the account before changing status.' }

      const currentStatus = current.status || (current.is_active ? 'active' : 'inactive')
      if (currentStatus === status) return { success: true } // no-op

      const isActiveVal = status === 'active' ? 1 : 0
      dbRun(`
        UPDATE users
        SET    status=?, is_active=?, updated_at=CURRENT_TIMESTAMP
        WHERE  id=? AND organization_id=?
      `, status, isActiveVal, id, orgId)

      const action = status === 'active' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED'
      audit(orgId, null, actorRole, action, 'users', id, {
        name: current.full_name, from: currentStatus, to: status,
      })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Soft-delete — RBAC-enforced ───────────────────────────────────────────────
  /**
   * Marks the user deleted_at / deleted_by. The row is preserved in the DB.
   * The auth handler rejects login for any user where deleted_at IS NOT NULL.
   * Pass actorId (the logged-in user's id) to record who performed the deletion.
   */
  'users:delete': async (_, { id, orgId, actorRole, actorOrgId, actorId }) => {
    try {
      const err = assertPermission(actorRole, actorOrgId, orgId)
      if (err) return { success: false, message: err }

      const current = dbGet(
        'SELECT full_name, deleted_at FROM users WHERE id=? AND organization_id=?',
        id, orgId,
      )
      if (!current) return { success: false, message: 'User not found' }
      if (current.deleted_at) return { success: true } // already deleted — idempotent

      dbRun(`
        UPDATE users
        SET    is_active=0, status='inactive',
               deleted_at=CURRENT_TIMESTAMP, deleted_by=?,
               updated_at=CURRENT_TIMESTAMP
        WHERE  id=? AND organization_id=?
      `, actorId || null, id, orgId)

      audit(orgId, actorId || null, actorRole || 'admin', 'USER_DELETED', 'users', id, {
        name: current.full_name,
      })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Restore a soft-deleted user — RBAC-enforced ───────────────────────────────
  'users:restore': async (_, { id, orgId, actorRole, actorOrgId }) => {
    try {
      const err = assertPermission(actorRole, actorOrgId, orgId)
      if (err) return { success: false, message: err }

      const current = dbGet(
        'SELECT full_name, deleted_at FROM users WHERE id=? AND organization_id=?',
        id, orgId,
      )
      if (!current) return { success: false, message: 'User not found' }
      if (!current.deleted_at) return { success: true } // not deleted — idempotent

      dbRun(`
        UPDATE users
        SET    deleted_at=NULL, deleted_by=NULL,
               is_active=1, status='active',
               updated_at=CURRENT_TIMESTAMP
        WHERE  id=? AND organization_id=?
      `, id, orgId)

      audit(orgId, null, actorRole, 'USER_RESTORED', 'users', id, { name: current.full_name })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Reset password ───────────────────────────────────────────────────────────
  'users:resetPassword': async (_, { id, orgId, newPassword }) => {
    try {
      const hash = await bcrypt.hash(newPassword || 'Welcome@123!', 10)
      dbRun(
        'UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?',
        hash, id, orgId,
      )
      audit(orgId, null, 'admin', 'RESET_PASSWORD', 'users', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
