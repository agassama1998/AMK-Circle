const { dbGet, dbAll, dbRun, audit } = require('../database/db')

module.exports = {
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

  'teachers:create': async (_, data) => {
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
      `, orgId, empId, data.fullName, data.arabicName||null, data.email||null, data.phone||null,
         data.gender||'male', data.specialization||null, data.hireDate||null,
         data.salary||0, data.status||'active', data.qualifications||null, data.notes||null)

      audit(orgId, null, 'admin', 'CREATE_TEACHER', 'teachers', result.lastInsertRowid, { name: data.fullName })
      return { success: true, id: result.lastInsertRowid, employeeId: empId }
    } catch (e) { return { success: false, message: e.message } }
  },

  'teachers:update': async (_, data) => {
    try {
      dbRun(`
        UPDATE teachers SET full_name=?, arabic_name=?, email=?, phone=?, gender=?,
          specialization=?, hire_date=?, salary=?, status=?, qualifications=?, notes=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND organization_id=?
      `, data.fullName, data.arabicName||null, data.email||null, data.phone||null,
         data.gender||'male', data.specialization||null, data.hireDate||null,
         data.salary||0, data.status||'active', data.qualifications||null, data.notes||null,
         data.id, data.orgId)
      audit(data.orgId, null, 'admin', 'UPDATE_TEACHER', 'teachers', data.id, { name: data.fullName })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'teachers:delete': async (_, { id, orgId }) => {
    try {
      dbRun(`UPDATE teachers SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?`, id, orgId)
      audit(orgId, null, 'admin', 'DEACTIVATE_TEACHER', 'teachers', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
