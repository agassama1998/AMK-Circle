const { dbGet, dbAll, dbRun, audit } = require('../database/db')
const { denyReadOnly } = require('./_rbac')

const STATUS_MANAGERS = ['super_admin', 'organization_admin']

function assertStatusPermission(actorRole, actorOrgId, targetOrgId) {
  if (!STATUS_MANAGERS.includes(actorRole))
    return 'Permission denied: only super_admin or organization_admin may change teacher status'
  if (actorRole === 'organization_admin' && String(actorOrgId) !== String(targetOrgId))
    return 'Access denied: cross-tenant status change is not permitted'
  return null
}

module.exports = {
  // ── Read: anyone with org access may view teachers ───────────────────────────
  'teachers:getAll': async (_, { orgId, status, search } = {}) => {
    try {
      let q = `SELECT t.*,
        (SELECT COUNT(*) FROM classes c WHERE c.teacher_id = t.id AND c.organization_id = t.organization_id) as class_count
        FROM teachers t WHERE t.organization_id = ?`
      const p = [orgId]
      if (status) { q += ' AND t.status = ?'; p.push(status) }
      if (search) { q += ' AND (t.full_name LIKE ? OR t.employee_id LIKE ? OR t.email LIKE ? OR t.specialization LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`) }
      q += ' ORDER BY t.full_name'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Write: blocked for parent/student ────────────────────────────────────────
  'teachers:create': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const { orgId } = data
      let empId = data.employeeId
      if (!empId) {
        const last = dbGet(`SELECT employee_id FROM teachers WHERE organization_id=? ORDER BY id DESC LIMIT 1`, orgId)
        const num = last ? parseInt(last.employee_id.replace(/\D/g, '')) + 1 : 1
        empId = `EMP-${String(num).padStart(3, '0')}`
      }
      const existing = dbGet('SELECT id FROM teachers WHERE organization_id=? AND employee_id=?', orgId, empId)
      if (existing) return { success: false, message: 'Employee ID already exists' }

      const result = dbRun(`
        INSERT INTO teachers (organization_id, employee_id, full_name, arabic_name, email, phone, gender,
          specialization, hire_date, salary, status, qualifications, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, orgId, empId, data.fullName, data.arabicName || null, data.email || null, data.phone || null,
         data.gender || 'male', data.specialization || null, data.hireDate || null,
         data.salary || 0, data.status || 'active', data.qualifications || null, data.notes || null)

      audit(orgId, null, 'admin', 'CREATE_TEACHER', 'teachers', result.lastInsertRowid, { name: data.fullName })
      return { success: true, id: result.lastInsertRowid, employeeId: empId }
    } catch (e) { return { success: false, message: e.message } }
  },

  'teachers:update': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`
        UPDATE teachers SET full_name=?, arabic_name=?, email=?, phone=?, gender=?,
          specialization=?, hire_date=?, salary=?, status=?, qualifications=?, notes=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND organization_id=?
      `, data.fullName, data.arabicName || null, data.email || null, data.phone || null,
         data.gender || 'male', data.specialization || null, data.hireDate || null,
         data.salary || 0, data.status || 'active', data.qualifications || null, data.notes || null,
         data.id, data.orgId)
      audit(data.orgId, null, 'admin', 'UPDATE_TEACHER', 'teachers', data.id, { name: data.fullName })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'teachers:updateStatus': async (_, { id, orgId, status, actorRole, actorOrgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      const err = assertStatusPermission(actorRole, actorOrgId, orgId)
      if (err) return { success: false, message: err }

      const valid = ['active', 'inactive']
      if (!valid.includes(status))
        return { success: false, message: `Invalid status. Allowed: ${valid.join(', ')}` }

      const current = dbGet('SELECT status, full_name FROM teachers WHERE id=? AND organization_id=?', id, orgId)
      if (!current) return { success: false, message: 'Teacher not found' }
      if (current.status === status) return { success: true }

      dbRun('UPDATE teachers SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?',
        status, id, orgId)

      audit(orgId, null, actorRole, 'TEACHER_STATUS_CHANGED', 'teachers', id, {
        name: current.full_name, old: current.status, new: status,
      })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'teachers:delete': async (_, { id, orgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      dbRun(`UPDATE teachers SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?`, id, orgId)
      audit(orgId, null, 'admin', 'DEACTIVATE_TEACHER', 'teachers', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
