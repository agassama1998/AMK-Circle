const { dbGet, dbAll, dbRun, audit } = require('../database/db')
const { denyReadOnly, getActor, getParentStudentIds, getStudentSelf, ERR_FORBIDDEN } = require('./_rbac')

function gradeLetter(marks, total = 100) {
  const pct = (marks / total) * 100
  if (pct >= 90) return 'A+'
  if (pct >= 85) return 'A'
  if (pct >= 80) return 'A-'
  if (pct >= 75) return 'B+'
  if (pct >= 70) return 'B'
  if (pct >= 65) return 'B-'
  if (pct >= 60) return 'C+'
  if (pct >= 55) return 'C'
  if (pct >= 50) return 'C-'
  if (pct >= 45) return 'D'
  return 'F'
}

module.exports = {
  // ── Read: exams list (parent/student may view their class exams) ──────────────
  'exams:getAll': async (_, { orgId, classId, status, token } = {}) => {
    try {
      // Students / parents may only see exams for their class — enforced via classId
      // They cannot create/update/delete, just read
      let q = `SELECT e.*, c.name as class_name, s.name as subject_name,
        (SELECT COUNT(*) FROM grades g WHERE g.exam_id = e.id) as grades_entered
        FROM exams e
        LEFT JOIN classes c ON e.class_id = c.id
        LEFT JOIN subjects s ON e.subject_id = s.id
        WHERE e.organization_id = ?`
      const params = [orgId]
      if (classId) { q += ' AND e.class_id = ?'; params.push(classId) }
      if (status)  { q += ' AND e.status = ?';   params.push(status) }
      q += ' ORDER BY e.exam_date DESC'
      return { success: true, data: dbAll(q, params) }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Write: exams CRUD (blocked for parent/student) ───────────────────────────
  'exams:create': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const result = dbRun(`
        INSERT INTO exams (organization_id, name, class_id, subject_id, exam_date,
          total_marks, passing_marks, exam_type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.name, data.classId||null, data.subjectId||null,
         data.examDate||null, data.totalMarks||100, data.passingMarks||50,
         data.examType||'written', data.status||'scheduled')
      audit(data.orgId, null, 'admin', 'CREATE_EXAM', 'exams', result.lastInsertRowid, { name: data.name })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'exams:update': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`
        UPDATE exams SET name=?, class_id=?, subject_id=?, exam_date=?,
          total_marks=?, passing_marks=?, exam_type=?, status=?
        WHERE id=? AND organization_id=?
      `, data.name, data.classId||null, data.subjectId||null, data.examDate||null,
         data.totalMarks||100, data.passingMarks||50, data.examType||'written',
         data.status||'scheduled', data.id, data.orgId)
      audit(data.orgId, null, 'admin', 'UPDATE_EXAM', 'exams', data.id, { name: data.name })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'exams:delete': async (_, { id, orgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      dbRun('DELETE FROM grades WHERE exam_id=?', id)
      dbRun('DELETE FROM exams WHERE id=? AND organization_id=?', id, orgId)
      audit(orgId, null, 'admin', 'DELETE_EXAM', 'exams', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Read: grades (scoped for student/parent) ──────────────────────────────────
  'exams:getGrades': async (_, { examId, orgId, token } = {}) => {
    try {
      const actor = getActor(token)
      const exam = dbGet('SELECT * FROM exams WHERE id=? AND organization_id=?', examId, orgId)
      if (!exam) return { success: false, message: 'Exam not found' }

      // Student: return only their own grade row
      if (actor?.role === 'student') {
        const self = getStudentSelf(actor.userId, orgId)
        if (!self) return ERR_FORBIDDEN
        const grade = dbGet(
          `SELECT g.*, s.full_name as student_name, s.student_id as student_code
           FROM grades g JOIN students s ON g.student_id = s.id
           WHERE g.exam_id=? AND g.organization_id=? AND g.student_id=?`,
          examId, orgId, self.id
        )
        return { success: true, data: grade ? [grade] : [], exam }
      }

      // Parent: return only linked children's grades
      if (actor?.role === 'parent') {
        const childIds = getParentStudentIds(actor.userId, orgId)
        if (childIds.length === 0) return { success: true, data: [], exam }
        const ph = childIds.map(() => '?').join(',')
        const grades = dbAll(
          `SELECT g.*, s.full_name as student_name, s.student_id as student_code
           FROM grades g JOIN students s ON g.student_id = s.id
           WHERE g.exam_id=? AND g.organization_id=? AND g.student_id IN (${ph})`,
          [examId, orgId, ...childIds]
        )
        return { success: true, data: grades, exam }
      }

      // Staff: full grades list with student roster
      let students = []
      if (exam.class_id) {
        students = dbAll(
          `SELECT s.id, s.student_id as student_code, s.full_name
           FROM students s WHERE s.class_id=? AND s.organization_id=? AND s.status='active'
           ORDER BY s.full_name`,
          exam.class_id, orgId
        )
      }

      const grades = dbAll(
        `SELECT g.*, s.full_name as student_name, s.student_id as student_code
         FROM grades g JOIN students s ON g.student_id = s.id
         WHERE g.exam_id=? AND g.organization_id=?`,
        examId, orgId
      )
      const gradeMap = {}
      grades.forEach(g => { gradeMap[g.student_id] = g })

      const merged = students.map(s => ({
        student_id: s.id, student_code: s.student_code, student_name: s.full_name,
        marks_obtained: gradeMap[s.id]?.marks_obtained ?? '',
        grade_letter:   gradeMap[s.id]?.grade_letter   ?? '',
        remarks:        gradeMap[s.id]?.remarks         ?? '',
      }))

      return { success: true, data: merged, exam }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Write: bulk save grades (blocked for parent/student) ─────────────────────
  'exams:bulkSaveGrades': async (_, { orgId, examId, grades, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      const exam = dbGet('SELECT total_marks FROM exams WHERE id=?', examId)
      for (const g of grades) {
        if (g.marks_obtained === '' || g.marks_obtained === null || g.marks_obtained === undefined) continue
        const letter = g.grade_letter || gradeLetter(Number(g.marks_obtained), exam?.total_marks || 100)
        dbRun(`
          INSERT INTO grades (organization_id, exam_id, student_id, marks_obtained, grade_letter, remarks)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(exam_id, student_id) DO UPDATE SET
            marks_obtained = excluded.marks_obtained,
            grade_letter   = excluded.grade_letter,
            remarks        = excluded.remarks
        `, orgId, examId, g.student_id, Number(g.marks_obtained), letter, g.remarks||null)
      }
      audit(orgId, null, 'admin', 'SAVE_GRADES', 'grades', examId, { count: grades.length })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
