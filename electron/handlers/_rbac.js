/**
 * AMK Circle — Backend RBAC / Authorization Guard
 *
 * Imported by every handler that needs to enforce role-based access.
 * All checks are based on the JWT verified server-side — the frontend
 * cannot bypass these by manipulating the request body.
 *
 * Permission Matrix:
 *  super_admin        → full access, all organisations
 *  organization_admin → full access, own org only
 *  principal          → read/write school data, own org
 *  teacher            → read/write school data, own org
 *  finance            → read/write finance data, own org
 *  imam               → read/write masjid data, own org
 *  parent             → READ ONLY, linked children only
 *  student            → READ ONLY, own record only
 */
'use strict'

const jwt            = require('jsonwebtoken')
const { dbGet, dbAll } = require('../database/db')

const JWT_SECRET = 'amkcircle-jwt-secret-2024-change-in-production'

// Roles that may NEVER perform any write operation
const READ_ONLY_ROLES = new Set(['parent', 'student'])

const ERR_FORBIDDEN = {
  success: false,
  message: 'You do not have permission to perform this action.',
  code:    403,
}
const ERR_AUTH = {
  success: false,
  message: 'Authentication required.',
  code:    401,
}

// ─── Token helpers ────────────────────────────────────────────────────────────

/**
 * Verify a JWT and return its decoded payload, or null if invalid / missing.
 */
function verifyToken(token) {
  if (!token) return null
  try { return jwt.verify(token, JWT_SECRET) } catch { return null }
}

/**
 * Decode without throwing. Alias for verifyToken.
 */
function getActor(token) {
  return verifyToken(token)
}

// ─── Write guard ──────────────────────────────────────────────────────────────

/**
 * Guard ALL write operations (create / update / delete).
 *
 * Call at the very top of any mutating handler:
 *   const guard = denyReadOnly(data.token)
 *   if (guard) return guard
 *
 * Returns an error object when:
 *   - No token, or token is invalid  → 401
 *   - Actor's role is 'parent' or 'student' → 403
 *
 * Returns null when the operation is permitted.
 */
function denyReadOnly(token) {
  const actor = verifyToken(token)
  if (!actor) return ERR_AUTH
  if (READ_ONLY_ROLES.has(actor.role)) return ERR_FORBIDDEN
  return null
}

// ─── Data-scoping helpers ─────────────────────────────────────────────────────

/**
 * Resolve all student IDs a parent user is authorised to view.
 *
 * Linkage is determined by (highest priority first):
 *  1. parents.user_id = actor.userId   (explicit FK, set via migration)
 *  2. parents.email   = user.email     (email match on parents table)
 *  3. students.parent_email = user.email (direct column on students row)
 *
 * Returns an array of student row IDs (integers). Empty array = no access.
 */
function getParentStudentIds(actorUserId, orgId) {
  const user = dbGet(
    'SELECT email, phone FROM users WHERE id=? AND organization_id=?',
    actorUserId, orgId
  )
  if (!user) return []

  const ids = new Set()

  // Method 1: parents table linked via user_id FK (after migration)
  try {
    const byUserId = dbAll(
      `SELECT s.id FROM students s
       JOIN parents p ON s.parent_id = p.id
       WHERE p.organization_id=? AND p.user_id=?`,
      orgId, actorUserId
    )
    byUserId.forEach(r => ids.add(r.id))
  } catch (_) { /* column may not exist yet */ }

  if (user.email) {
    // Method 2: parents table matched by email
    const parent = dbGet(
      'SELECT id FROM parents WHERE organization_id=? AND LOWER(email)=LOWER(?)',
      orgId, user.email
    )
    if (parent) {
      const linked = dbAll(
        'SELECT id FROM students WHERE organization_id=? AND parent_id=?',
        orgId, parent.id
      )
      linked.forEach(r => ids.add(r.id))
    }

    // Method 3: parent_email column directly on students
    const direct = dbAll(
      'SELECT id FROM students WHERE organization_id=? AND LOWER(parent_email)=LOWER(?)',
      orgId, user.email
    )
    direct.forEach(r => ids.add(r.id))
  }

  return [...ids]
}

/**
 * Resolve the student row that belongs to a student user account.
 *
 * Linkage is determined by (highest priority first):
 *  1. students.user_id = actor.userId  (explicit FK, set via migration)
 *  2. students.student_id = user.username  (username used as student_id)
 *
 * Returns the student row object, or null if no match.
 */
function getStudentSelf(actorUserId, orgId) {
  // Method 1: explicit FK
  try {
    const byUserId = dbGet(
      'SELECT * FROM students WHERE organization_id=? AND user_id=?',
      orgId, actorUserId
    )
    if (byUserId) return byUserId
  } catch (_) { /* column may not exist yet */ }

  // Method 2: username = student_id (common provisioning convention)
  const user = dbGet(
    'SELECT username FROM users WHERE id=? AND organization_id=?',
    actorUserId, orgId
  )
  if (user?.username) {
    const byStudentId = dbGet(
      'SELECT * FROM students WHERE organization_id=? AND student_id=?',
      orgId, user.username
    )
    if (byStudentId) return byStudentId
  }

  return null
}

module.exports = {
  denyReadOnly,
  getActor,
  getParentStudentIds,
  getStudentSelf,
  READ_ONLY_ROLES,
  ERR_FORBIDDEN,
  ERR_AUTH,
}
