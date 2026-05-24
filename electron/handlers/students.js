const { dbGet, dbAll, dbRun, audit } = require('../database/db')

module.exports = {
  'students:getAll': async (_, { orgId, search, status, classId } = {}) => {
    try {
      let q = `SELECT s.*, c.name as class_name FROM students s
               LEFT JOIN classes c ON s.class_id = c.id
               WHERE s.organization_id = ?`
      const p = [orgId]
      if (status)  { q += ' AND s.status = ?'; p.push(status) }
      if (classId) { q += ' AND s.class_id = ?'; p.push(classId) }
      if (search)  {
        q += ' AND (s.full_name LIKE ? OR s.student_id LIKE ? OR s.parent_name LIKE ? OR s.arabic_name LIKE ?)'
        p.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      }
      q += ' ORDER BY s.full_name'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'students:getById': async (_, { id, orgId }) => {
    try {
      const s = dbGet(`SELECT s.*, c.name as class_name FROM students s
                       LEFT JOIN classes c ON s.class_id = c.id
                       WHERE s.id = ? AND s.organization_id = ?`, id, orgId)
      if (!s) return { success: false, message: 'Student not found' }
      return { success: true, data: s }
    } catch (e) { return { success: false, message: e.message } }
  },

  'students:create': async (_, data) => {
    try {
      const { orgId } = data
      // Auto-generate student ID if not provided
      let studentId = data.studentId
      if (!studentId) {
        const last = dbGet(`SELECT student_id FROM students WHERE organization_id=? ORDER BY id DESC LIMIT 1`, orgId)
        const num = last ? parseInt(last.student_id.replace(/\D/g, '')) + 1 : 1001
        studentId = `STU-${String(num).padStart(4, '0')}`
      }
      const existing = dbGet('SELECT id FROM students WHERE organization_id=? AND student_id=?', orgId, studentId)
      if (existing) return { success: false, message: 'Student ID already exists' }

      const result = dbRun(`
        INSERT INTO students (organization_id, student_id, full_name, arabic_name, date_of_birth, gender,
          nationality, class_id, parent_name, parent_phone, parent_email, address, enrolled_date, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, orgId, studentId, data.fullName, data.arabicName||null, data.dateOfBirth||null,
         data.gender||'male', data.nationality||null, data.classId||null,
         data.parentName||null, data.parentPhone||null, data.parentEmail||null,
         data.address||null, data.enrolledDate||new Date().toISOString().split('T')[0],
         data.status||'active', data.notes||null)

      audit(orgId, null, 'admin', 'CREATE_STUDENT', 'students', result.lastInsertRowid, { name: data.fullName, id: studentId })
      return { success: true, id: result.lastInsertRowid, studentId }
    } catch (e) { return { success: false, message: e.message } }
  },

  'students:update': async (_, data) => {
    try {
      dbRun(`
        UPDATE students SET full_name=?, arabic_name=?, date_of_birth=?, gender=?, nationality=?,
          class_id=?, parent_name=?, parent_phone=?, parent_email=?, address=?,
          enrolled_date=?, status=?, notes=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND organization_id=?
      `, data.fullName, data.arabicName||null, data.dateOfBirth||null, data.gender||'male',
         data.nationality||null, data.classId||null, data.parentName||null, data.parentPhone||null,
         data.parentEmail||null, data.address||null, data.enrolledDate||null,
         data.status||'active', data.notes||null, data.id, data.orgId)
      audit(data.orgId, null, 'admin', 'UPDATE_STUDENT', 'students', data.id, { name: data.fullName })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'students:delete': async (_, { id, orgId }) => {
    try {
      dbRun(`UPDATE students SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=?`, id, orgId)
      audit(orgId, null, 'admin', 'DEACTIVATE_STUDENT', 'students', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Quran Progress ─────────────────────────────────────────────────────────
  'quran:getByStudent': async (_, { studentId, orgId }) => {
    try {
      const data = dbAll(`
        SELECT qp.*, t.full_name as teacher_name
        FROM quran_progress qp
        LEFT JOIN teachers t ON qp.teacher_id = t.id
        WHERE qp.student_id = ? AND qp.organization_id = ?
        ORDER BY qp.date DESC
      `, studentId, orgId)
      return { success: true, data }
    } catch (e) { return { success: false, message: e.message } }
  },

  'quran:add': async (_, data) => {
    try {
      const result = dbRun(`
        INSERT INTO quran_progress (organization_id, student_id, date, surah_name, surah_number, ayah_from, ayah_to, juz_number, pages, type, grade, teacher_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.studentId, data.date, data.surahName||null, data.surahNumber||null,
         data.ayahFrom||null, data.ayahTo||null, data.juzNumber||null, data.pages||null,
         data.type||'memorization', data.grade||null, data.teacherId||null, data.notes||null)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'quran:update': async (_, data) => {
    try {
      dbRun(`
        UPDATE quran_progress SET date=?, surah_name=?, surah_number=?, ayah_from=?, ayah_to=?,
          juz_number=?, pages=?, type=?, grade=?, notes=?
        WHERE id=? AND organization_id=?
      `, data.date, data.surahName||null, data.surahNumber||null, data.ayahFrom||null,
         data.ayahTo||null, data.juzNumber||null, data.pages||null, data.type||'memorization',
         data.grade||null, data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'quran:delete': async (_, { id, orgId }) => {
    try {
      dbRun('DELETE FROM quran_progress WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
