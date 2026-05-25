const { dbAll, dbRun, audit } = require('../database/db')

module.exports = {
  'subjects:getAll': async (_, { orgId, classId } = {}) => {
    try {
      let q = `SELECT s.*, c.name as class_name, t.full_name as teacher_name
        FROM subjects s
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN teachers t ON s.teacher_id = t.id
        WHERE s.organization_id = ?`
      const params = [orgId]
      if (classId) { q += ' AND s.class_id = ?'; params.push(classId) }
      q += ' ORDER BY c.name, s.name'
      return { success: true, data: dbAll(q, params) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'subjects:create': async (_, data) => {
    try {
      const result = dbRun(`
        INSERT INTO subjects (organization_id, name, code, description, class_id, teacher_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, data.orgId, data.name, data.code||null, data.description||null,
         data.classId||null, data.teacherId||null)
      audit(data.orgId, null, 'admin', 'CREATE_SUBJECT', 'subjects', result.lastInsertRowid, { name: data.name })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'subjects:update': async (_, data) => {
    try {
      dbRun(`
        UPDATE subjects SET name=?, code=?, description=?, class_id=?, teacher_id=?
        WHERE id=? AND organization_id=?
      `, data.name, data.code||null, data.description||null,
         data.classId||null, data.teacherId||null, data.id, data.orgId)
      audit(data.orgId, null, 'admin', 'UPDATE_SUBJECT', 'subjects', data.id, { name: data.name })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'subjects:delete': async (_, { id, orgId }) => {
    try {
      dbRun('DELETE FROM subjects WHERE id=? AND organization_id=?', id, orgId)
      audit(orgId, null, 'admin', 'DELETE_SUBJECT', 'subjects', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
