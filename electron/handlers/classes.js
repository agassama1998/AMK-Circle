const { dbGet, dbAll, dbRun, audit } = require('../database/db')
const { denyReadOnly } = require('./_rbac')

module.exports = {
  'classes:getAll': async (_, { orgId, status } = {}) => {
    try {
      let q = `SELECT c.*, t.full_name as teacher_name,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
        FROM classes c LEFT JOIN teachers t ON c.teacher_id = t.id
        WHERE c.organization_id = ?`
      const p = [orgId]
      if (status) { q += ' AND c.status = ?'; p.push(status) }
      q += ' ORDER BY c.name'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Write: blocked for parent/student ────────────────────────────────────────
  'classes:create': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const result = dbRun(`
        INSERT INTO classes (organization_id, name, grade_level, teacher_id, room, capacity, schedule, academic_year, department, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.name, data.gradeLevel||null, data.teacherId||null,
         data.room||null, data.capacity||30, data.schedule||null,
         data.academicYear||null, data.department||null, data.status||'active')
      audit(data.orgId, null, 'admin', 'CREATE_CLASS', 'classes', result.lastInsertRowid, { name: data.name })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'classes:update': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`
        UPDATE classes SET name=?, grade_level=?, teacher_id=?, room=?, capacity=?,
          schedule=?, academic_year=?, department=?, status=?
        WHERE id=? AND organization_id=?
      `, data.name, data.gradeLevel||null, data.teacherId||null, data.room||null,
         data.capacity||30, data.schedule||null, data.academicYear||null,
         data.department||null, data.status||'active', data.id, data.orgId)
      audit(data.orgId, null, 'admin', 'UPDATE_CLASS', 'classes', data.id, { name: data.name })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'classes:delete': async (_, { id, orgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      const inUse = dbGet('SELECT id FROM students WHERE class_id=? AND status=?', id, 'active')
      if (inUse) return { success: false, message: 'Cannot delete class with active students. Reassign students first.' }
      dbRun('UPDATE classes SET status=? WHERE id=? AND organization_id=?', 'inactive', id, orgId)
      audit(orgId, null, 'admin', 'DEACTIVATE_CLASS', 'classes', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
