const { dbGet, dbAll, dbRun, audit } = require('../database/db')

module.exports = {
  'parents:getAll': async (_, { orgId, search } = {}) => {
    try {
      let q = `SELECT p.*,
        (SELECT COUNT(*) FROM students s WHERE s.parent_id = p.id) as student_count
        FROM parents p WHERE p.organization_id = ?`
      const params = [orgId]
      if (search) {
        q += ` AND (p.full_name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)`
        const s = `%${search}%`; params.push(s, s, s)
      }
      q += ' ORDER BY p.full_name'
      return { success: true, data: dbAll(q, params) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'parents:create': async (_, data) => {
    try {
      const result = dbRun(`
        INSERT INTO parents (organization_id, full_name, email, phone, alt_phone, address, occupation, relationship, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.fullName, data.email||null, data.phone||null,
         data.altPhone||null, data.address||null, data.occupation||null,
         data.relationship||'father', data.notes||null)
      audit(data.orgId, null, 'admin', 'CREATE_PARENT', 'parents', result.lastInsertRowid, { name: data.fullName })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'parents:update': async (_, data) => {
    try {
      dbRun(`
        UPDATE parents SET full_name=?, email=?, phone=?, alt_phone=?, address=?,
          occupation=?, relationship=?, notes=?
        WHERE id=? AND organization_id=?
      `, data.fullName, data.email||null, data.phone||null, data.altPhone||null,
         data.address||null, data.occupation||null, data.relationship||'father',
         data.notes||null, data.id, data.orgId)
      audit(data.orgId, null, 'admin', 'UPDATE_PARENT', 'parents', data.id, { name: data.fullName })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'parents:delete': async (_, { id, orgId }) => {
    try {
      const inUse = dbGet('SELECT id FROM students WHERE parent_id=?', id)
      if (inUse) return { success: false, message: 'Cannot delete — this parent is linked to a student. Unlink them first.' }
      dbRun('DELETE FROM parents WHERE id=? AND organization_id=?', id, orgId)
      audit(orgId, null, 'admin', 'DELETE_PARENT', 'parents', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
