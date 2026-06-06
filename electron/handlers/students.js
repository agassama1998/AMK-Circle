const { dbGet, dbAll, dbRun, dbTransaction, audit } = require('../database/db')
const {
  denyReadOnly, getActor,
  getParentStudentIds, getStudentSelf,
  ERR_FORBIDDEN,
} = require('./_rbac')

// ─── Status permission helpers ────────────────────────────────────────────────
const STATUS_MANAGERS = ['super_admin', 'organization_admin']

function assertStatusPermission(actorRole, actorOrgId, targetOrgId) {
  if (!STATUS_MANAGERS.includes(actorRole))
    return 'Permission denied: only super_admin or organization_admin may change student status'
  if (actorRole === 'organization_admin' && String(actorOrgId) !== String(targetOrgId))
    return 'Access denied: cross-tenant status change is not permitted'
  return null
}

// ─── Read scoping helper ──────────────────────────────────────────────────────
/**
 * Returns student WHERE clause + params scoped for parent/student roles.
 * Returns null if the caller is a staff role (no extra scoping).
 */
function scopeStudentsRead(actor, orgId) {
  if (!actor) return null // unauthenticated — let handler proceed (will hit other guards)
  if (actor.role === 'student') {
    const self = getStudentSelf(actor.userId, orgId)
    return self ? { ids: [self.id] } : { ids: [] }
  }
  if (actor.role === 'parent') {
    const ids = getParentStudentIds(actor.userId, orgId)
    return { ids }
  }
  return null // staff — no extra scoping
}

module.exports = {
  // ── List students ───────────────────────────────────────────────────────────
  'students:getAll': async (_, { orgId, search, status, classId, token } = {}) => {
    try {
      const actor = getActor(token)
      const scope = scopeStudentsRead(actor, orgId)

      // Parent / student: return only their own records
      if (scope) {
        if (scope.ids.length === 0) return { success: true, data: [] }
        const ph = scope.ids.map(() => '?').join(',')
        const rows = dbAll(
          `SELECT s.*, c.name as class_name FROM students s
           LEFT JOIN classes c ON s.class_id = c.id
           WHERE s.id IN (${ph})`,
          scope.ids
        )
        return { success: true, data: rows }
      }

      // Staff / admin: full org query with filters
      let q = `SELECT s.*, c.name as class_name FROM students s
               LEFT JOIN classes c ON s.class_id = c.id
               WHERE s.organization_id = ?`
      const p = [orgId]
      if (status)  { q += ' AND s.status = ?';       p.push(status) }
      if (classId) { q += ' AND s.class_id = ?';     p.push(classId) }
      if (search)  {
        q += ' AND (s.full_name LIKE ? OR s.student_id LIKE ? OR s.parent_name LIKE ? OR s.arabic_name LIKE ?)'
        p.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      }
      q += ' ORDER BY s.full_name'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Get single student ──────────────────────────────────────────────────────
  'students:getById': async (_, { id, orgId, token } = {}) => {
    try {
      const actor = getActor(token)

      // Student: may only fetch themselves
      if (actor?.role === 'student') {
        const self = getStudentSelf(actor.userId, orgId)
        if (!self || String(self.id) !== String(id)) return ERR_FORBIDDEN
      }

      // Parent: may only fetch linked children
      if (actor?.role === 'parent') {
        const allowed = getParentStudentIds(actor.userId, orgId)
        if (!allowed.map(String).includes(String(id))) return ERR_FORBIDDEN
      }

      const s = dbGet(
        `SELECT s.*, c.name as class_name FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.id = ? AND s.organization_id = ?`,
        id, orgId
      )
      if (!s) return { success: false, message: 'Student not found' }
      return { success: true, data: s }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Create student (WRITE — blocked for parent/student) ─────────────────────
  'students:create': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const { orgId } = data
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

  // ── Update student (WRITE — blocked for parent/student) ─────────────────────
  'students:update': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
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

  // ── Delete student (super_admin or organization_admin only) ─────────────────
  'students:delete': async (_, { id, orgId, token }) => {
    const actor = getActor(token)
    if (!actor) return { success: false, message: 'Authentication required.', code: 401 }

    const DELETE_ROLES = ['super_admin', 'organization_admin']
    if (!DELETE_ROLES.includes(actor.role))
      return { success: false, message: 'Permission denied: only super_admin or organization_admin may delete students.', code: 403 }
    if (actor.role === 'organization_admin' && String(actor.orgId) !== String(orgId))
      return { success: false, message: 'Access denied: you may only delete students within your own organization.', code: 403 }

    try {
      const result = dbTransaction(() => {
        const student = dbGet('SELECT id, full_name, student_id, organization_id FROM students WHERE id=? AND organization_id=?', id, orgId)
        if (!student) return { success: false, message: 'Student not found' }

        // Remove all dependent records first
        dbRun('DELETE FROM attendance          WHERE student_id=? AND organization_id=?', id, orgId)
        dbRun('DELETE FROM quran_progress      WHERE student_id=? AND organization_id=?', id, orgId)
        dbRun('DELETE FROM grades              WHERE student_id=?', id)
        dbRun('DELETE FROM boarding_assignments WHERE student_id=? AND organization_id=?', id, orgId)
        dbRun('DELETE FROM hifz_milestones     WHERE student_id=? AND organization_id=?', id, orgId)
        // Nullify student_id on payments — preserve financial audit trail
        dbRun('UPDATE payments SET student_id=NULL WHERE student_id=? AND organization_id=?', id, orgId)
        // Hard delete the student record
        dbRun('DELETE FROM students WHERE id=? AND organization_id=?', id, orgId)

        audit(orgId, actor.userId, actor.username, 'DELETE_STUDENT', 'students', id, {
          name: student.full_name,
          student_id: student.student_id,
          deleted_by_role: actor.role,
        })
        return { success: true }
      })
      return result
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Status management (RBAC-enforced) ────────────────────────────────────────
  'students:updateStatus': async (_, { id, orgId, status, actorRole, actorOrgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      const err = assertStatusPermission(actorRole, actorOrgId, orgId)
      if (err) return { success: false, message: err }

      const valid = ['active', 'inactive', 'graduated', 'suspended']
      if (!valid.includes(status))
        return { success: false, message: `Invalid status. Allowed: ${valid.join(', ')}` }

      const current = dbGet('SELECT status, full_name FROM students WHERE id=? AND organization_id=?', id, orgId)
      if (!current) return { success: false, message: 'Student not found' }
      if (current.status === status) return { success: true }

      if (status === 'graduated') {
        const today = new Date().toISOString().split('T')[0]
        dbRun(`UPDATE students SET status='graduated', graduation_date=?, updated_at=CURRENT_TIMESTAMP
               WHERE id=? AND organization_id=?`, today, id, orgId)
      } else {
        dbRun(`UPDATE students SET status=?, updated_at=CURRENT_TIMESTAMP
               WHERE id=? AND organization_id=?`, status, id, orgId)
      }

      audit(orgId, null, actorRole, 'STUDENT_STATUS_CHANGED', 'students', id, {
        name: current.full_name, old: current.status, new: status,
      })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Quran Progress ─────────────────────────────────────────────────────────

  'quran:getByStudent': async (_, { studentId, orgId, token } = {}) => {
    try {
      const actor = getActor(token)

      // Student: only own progress
      if (actor?.role === 'student') {
        const self = getStudentSelf(actor.userId, orgId)
        if (!self || String(self.id) !== String(studentId)) return ERR_FORBIDDEN
      }
      // Parent: only linked children
      if (actor?.role === 'parent') {
        const allowed = getParentStudentIds(actor.userId, orgId)
        if (!allowed.map(String).includes(String(studentId))) return ERR_FORBIDDEN
      }

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

  // ── Write: Quran add/update/delete (blocked for parent/student) ──────────────
  'quran:add': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
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
    const guard = denyReadOnly(data.token)
    if (guard) return guard
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

  'quran:delete': async (_, { id, orgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      dbRun('DELETE FROM quran_progress WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
