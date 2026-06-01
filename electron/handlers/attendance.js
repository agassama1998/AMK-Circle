const { dbGet, dbAll, dbRun } = require('../database/db')
const { denyReadOnly, getActor, getParentStudentIds, getStudentSelf, ERR_FORBIDDEN } = require('./_rbac')

module.exports = {
  // ── Read: by date (staff only — scoped below if needed) ──────────────────────
  'attendance:getByDate': async (_, { orgId, date, classId, token } = {}) => {
    try {
      // Parents and students should not be querying class-level attendance
      const actor = getActor(token)
      if (actor?.role === 'parent' || actor?.role === 'student') return ERR_FORBIDDEN

      let q = `SELECT s.id, s.student_id, s.full_name, s.arabic_name, c.name as class_name,
                      a.status, a.notes, a.id as att_id
               FROM students s
               LEFT JOIN classes c ON s.class_id = c.id
               LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ? AND a.organization_id = ?
               WHERE s.organization_id = ? AND s.status = 'active'`
      const p = [date, orgId, orgId]
      if (classId) { q += ' AND s.class_id = ?'; p.push(classId) }
      q += ' ORDER BY s.full_name'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Read: by student (scoped for student/parent roles) ───────────────────────
  'attendance:getByStudent': async (_, { orgId, studentId, startDate, endDate, token } = {}) => {
    try {
      const actor = getActor(token)

      // Student: only own records
      if (actor?.role === 'student') {
        const self = getStudentSelf(actor.userId, orgId)
        if (!self || String(self.id) !== String(studentId)) return ERR_FORBIDDEN
      }
      // Parent: only linked children
      if (actor?.role === 'parent') {
        const allowed = getParentStudentIds(actor.userId, orgId)
        if (!allowed.map(String).includes(String(studentId))) return ERR_FORBIDDEN
      }

      let q = `SELECT * FROM attendance WHERE organization_id = ? AND student_id = ?`
      const p = [orgId, studentId]
      if (startDate) { q += ' AND date >= ?'; p.push(startDate) }
      if (endDate)   { q += ' AND date <= ?'; p.push(endDate) }
      q += ' ORDER BY date DESC'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Write: save attendance (blocked for parent/student) ──────────────────────
  'attendance:save': async (_, { orgId, date, classId, records, recordedBy, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      const { getDb } = require('../database/db')
      const db = getDb()
      const upsert = db.prepare(`
        INSERT INTO attendance (organization_id, student_id, class_id, date, status, notes, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(organization_id, student_id, date)
        DO UPDATE SET status=excluded.status, notes=excluded.notes, recorded_by=excluded.recorded_by
      `)
      const saveAll = db.transaction((recs) => {
        for (const r of recs) {
          upsert.run(orgId, r.studentId, classId||null, date, r.status||'present', r.notes||null, recordedBy||null)
        }
      })
      saveAll(records)
      return { success: true, saved: records.length }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Read: stats (scoped for student/parent roles) ────────────────────────────
  'attendance:getStats': async (_, { orgId, studentId, startDate, endDate, token } = {}) => {
    try {
      const actor = getActor(token)

      // Student: only own stats
      if (actor?.role === 'student') {
        const self = getStudentSelf(actor.userId, orgId)
        if (!self) return ERR_FORBIDDEN
        // Force studentId to be self
        studentId = self.id
      }
      // Parent: only linked children
      if (actor?.role === 'parent' && studentId) {
        const allowed = getParentStudentIds(actor.userId, orgId)
        if (!allowed.map(String).includes(String(studentId))) return ERR_FORBIDDEN
      }

      let q = `SELECT status, COUNT(*) as count FROM attendance WHERE organization_id = ?`
      const p = [orgId]
      if (studentId) { q += ' AND student_id = ?'; p.push(studentId) }
      if (startDate) { q += ' AND date >= ?'; p.push(startDate) }
      if (endDate)   { q += ' AND date <= ?'; p.push(endDate) }
      q += ' GROUP BY status'
      const rows = dbAll(q, p)
      const map = {}
      rows.forEach(r => { map[r.status] = r.count })
      return { success: true, data: {
        present: map.present || 0,
        absent:  map.absent  || 0,
        late:    map.late    || 0,
        excused: map.excused || 0,
        total:   Object.values(map).reduce((a, b) => a + b, 0),
      }}
    } catch (e) { return { success: false, message: e.message } }
  },
}
