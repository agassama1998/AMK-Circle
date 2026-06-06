const { dbGet, dbAll, dbRun, dbTransaction, audit } = require('../database/db')
const { denyReadOnly, getActor } = require('./_rbac')

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
    const actor = getActor(token)
    if (!actor) return { success: false, message: 'Authentication required.', code: 401 }

    const DELETE_ROLES = ['super_admin', 'organization_admin']
    if (!DELETE_ROLES.includes(actor.role))
      return { success: false, message: 'Permission denied: only super_admin or organization_admin may delete teachers.', code: 403 }
    if (actor.role === 'organization_admin' && String(actor.orgId) !== String(orgId))
      return { success: false, message: 'Access denied: you may only delete teachers within your own organization.', code: 403 }

    try {
      const result = dbTransaction(() => {
        const teacher = dbGet('SELECT id, full_name, employee_id, organization_id FROM teachers WHERE id=? AND organization_id=?', id, orgId)
        if (!teacher) return { success: false, message: 'Teacher not found' }

        // Nullify FK references so dependent records are preserved
        dbRun('UPDATE classes          SET teacher_id=NULL WHERE teacher_id=? AND organization_id=?', id, orgId)
        dbRun('UPDATE subjects         SET teacher_id=NULL WHERE teacher_id=? AND organization_id=?', id, orgId)
        dbRun('UPDATE quran_progress   SET teacher_id=NULL WHERE teacher_id=? AND organization_id=?', id, orgId)
        // Remove salary records tied to this teacher
        dbRun('DELETE FROM salaries WHERE teacher_id=? AND organization_id=?', id, orgId)
        // Hard delete the teacher record
        dbRun('DELETE FROM teachers WHERE id=? AND organization_id=?', id, orgId)

        audit(orgId, actor.userId, actor.username, 'DELETE_TEACHER', 'teachers', id, {
          name: teacher.full_name,
          employee_id: teacher.employee_id,
          deleted_by_role: actor.role,
        })
        return { success: true }
      })
      return result
    } catch (e) { return { success: false, message: e.message } }
  },
}
