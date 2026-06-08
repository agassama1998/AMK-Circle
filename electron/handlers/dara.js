const { dbGet, dbAll, dbRun, audit } = require('../database/db')
const { denyReadOnly, getActor, getParentStudentIds, getStudentSelf, ERR_FORBIDDEN } = require('./_rbac')

module.exports = {
  // ─── Hifz Progress (read-scoped for student/parent) ────────────────────────
  'dara:getHifzProgress': async (_, { orgId, classId, search, token } = {}) => {
    try {
      const actor = getActor(token)

      // Student: only self
      if (actor?.role === 'student') {
        const self = getStudentSelf(actor.userId, orgId)
        if (!self) return { success: true, data: [] }
        const row = dbGet(`
          SELECT s.id, s.student_id, s.full_name, s.arabic_name, s.gender, c.name as class_name,
            COUNT(DISTINCT qp.id) as total_sessions,
            COUNT(DISTINCT hm.id) as milestones_completed,
            MAX(hm.pages_completed) as pages_memorized,
            ROUND(COALESCE(MAX(hm.pages_completed),0) * 100.0 / 604, 1) as percent_complete
          FROM students s
          LEFT JOIN classes c ON s.class_id = c.id
          LEFT JOIN quran_progress qp ON qp.student_id = s.id AND qp.organization_id = s.organization_id
          LEFT JOIN hifz_milestones hm ON hm.student_id = s.id AND hm.organization_id = s.organization_id
          WHERE s.organization_id = ? AND s.id = ?
          GROUP BY s.id
        `, orgId, self.id)
        return { success: true, data: row ? [row] : [] }
      }

      // Parent: only linked children
      if (actor?.role === 'parent') {
        const childIds = getParentStudentIds(actor.userId, orgId)
        if (childIds.length === 0) return { success: true, data: [] }
        const ph = childIds.map(() => '?').join(',')
        const data = dbAll(`
          SELECT s.id, s.student_id, s.full_name, s.arabic_name, s.gender, c.name as class_name,
            COUNT(DISTINCT qp.id) as total_sessions,
            COUNT(DISTINCT hm.id) as milestones_completed,
            MAX(hm.pages_completed) as pages_memorized,
            ROUND(COALESCE(MAX(hm.pages_completed),0) * 100.0 / 604, 1) as percent_complete
          FROM students s
          LEFT JOIN classes c ON s.class_id = c.id
          LEFT JOIN quran_progress qp ON qp.student_id = s.id AND qp.organization_id = s.organization_id
          LEFT JOIN hifz_milestones hm ON hm.student_id = s.id AND hm.organization_id = s.organization_id
          WHERE s.organization_id = ? AND s.id IN (${ph})
          GROUP BY s.id ORDER BY percent_complete DESC
        `, [orgId, ...childIds])
        return { success: true, data }
      }

      // Staff: full list
      let q = `SELECT s.id, s.student_id, s.full_name, s.arabic_name, s.gender, c.name as class_name,
        COUNT(DISTINCT qp.id) as total_sessions,
        COUNT(DISTINCT hm.id) as milestones_completed,
        MAX(hm.pages_completed) as pages_memorized,
        ROUND(COALESCE(MAX(hm.pages_completed),0) * 100.0 / 604, 1) as percent_complete
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN quran_progress qp ON qp.student_id = s.id AND qp.organization_id = s.organization_id
        LEFT JOIN hifz_milestones hm ON hm.student_id = s.id AND hm.organization_id = s.organization_id
        WHERE s.organization_id = ? AND s.status = 'active'`
      const p = [orgId]
      if (classId) { q += ' AND s.class_id = ?'; p.push(classId) }
      if (search)  { q += ' AND (s.full_name LIKE ? OR s.student_id LIKE ?)'; p.push(`%${search}%`, `%${search}%`) }
      q += ' GROUP BY s.id ORDER BY percent_complete DESC, s.full_name'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:getMilestones': async (_, { orgId, studentId, token } = {}) => {
    try {
      const actor = getActor(token)

      // Student: only own milestones
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
        SELECT hm.*, t.full_name as verified_by_name
        FROM hifz_milestones hm LEFT JOIN teachers t ON hm.verified_by = t.id
        WHERE hm.organization_id = ? AND hm.student_id = ?
        ORDER BY hm.completed_date DESC
      `, orgId, studentId)
      return { success: true, data }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Write: milestones (blocked for parent/student) ───────────────────────────
  'dara:addMilestone': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const result = dbRun(`
        INSERT INTO hifz_milestones (organization_id, student_id, milestone_type, juz_number, surah_name,
          pages_completed, total_pages, completed_date, verified_by, grade, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.studentId, data.milestoneType, data.juzNumber||null, data.surahName||null,
         data.pagesCompleted||null, 604, data.completedDate||new Date().toISOString().split('T')[0],
         data.verifiedBy||null, data.grade||null, data.notes||null)
      audit(data.orgId, null, 'teacher', 'ADD_MILESTONE', 'hifz_milestones', result.lastInsertRowid, { studentId: data.studentId, type: data.milestoneType })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:updateMilestone': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`UPDATE hifz_milestones SET milestone_type=?, juz_number=?, surah_name=?, pages_completed=?,
        completed_date=?, verified_by=?, grade=?, notes=? WHERE id=? AND organization_id=?`,
        data.milestoneType, data.juzNumber||null, data.surahName||null, data.pagesCompleted||null,
        data.completedDate||null, data.verifiedBy||null, data.grade||null, data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:deleteMilestone': async (_, { id, orgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      dbRun('DELETE FROM hifz_milestones WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Dormitories (blocked entirely for parent/student) ────────────────────
  'dara:getDormitories': async (_, { orgId, token } = {}) => {
    try {
      const actor = getActor(token)
      if (actor?.role === 'parent' || actor?.role === 'student') return ERR_FORBIDDEN
      const data = dbAll(`
        SELECT d.*, t.full_name as supervisor_name,
          (SELECT COUNT(*) FROM boarding_assignments ba WHERE ba.dormitory_id = d.id AND ba.status = 'active') as occupied
        FROM dormitories d LEFT JOIN teachers t ON d.supervisor_id = t.id
        WHERE d.organization_id = ?
        ORDER BY d.name
      `, orgId)
      return { success: true, data }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:createDormitory': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const result = dbRun(`INSERT INTO dormitories (organization_id, name, capacity, supervisor_id, gender, floor, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        data.orgId, data.name, data.capacity||10, data.supervisorId||null, data.gender||'male', data.floor||null, data.status||'active', data.notes||null)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:updateDormitory': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`UPDATE dormitories SET name=?, capacity=?, supervisor_id=?, gender=?, floor=?, status=?, notes=? WHERE id=? AND organization_id=?`,
        data.name, data.capacity||10, data.supervisorId||null, data.gender||'male', data.floor||null, data.status||'active', data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Boarding Assignments (blocked for parent/student) ────────────────────
  'dara:getAssignments': async (_, { orgId, dormitoryId, status, token } = {}) => {
    try {
      const actor = getActor(token)
      if (actor?.role === 'parent' || actor?.role === 'student') return ERR_FORBIDDEN
      let q = `SELECT ba.*, s.full_name as student_name, s.student_id as student_no,
                      s.gender as student_gender, d.name as dormitory_name
               FROM boarding_assignments ba
               JOIN students s ON ba.student_id = s.id
               LEFT JOIN dormitories d ON ba.dormitory_id = d.id
               WHERE ba.organization_id = ?`
      const p = [orgId]
      if (dormitoryId) { q += ' AND ba.dormitory_id = ?'; p.push(dormitoryId) }
      if (status)      { q += ' AND ba.status = ?';       p.push(status) }
      q += ' ORDER BY s.full_name'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:assignBoarding': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const result = dbRun(`
        INSERT INTO boarding_assignments (organization_id, student_id, dormitory_id, room_number, bed_number,
          check_in_date, boarding_fee, meal_plan, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.studentId, data.dormitoryId||null, data.roomNumber||null, data.bedNumber||null,
         data.checkInDate||new Date().toISOString().split('T')[0], data.boardingFee||0,
         data.mealPlan||'full', data.status||'active', data.notes||null)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:updateAssignment': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`UPDATE boarding_assignments SET dormitory_id=?, room_number=?, bed_number=?, check_in_date=?, check_out_date=?, boarding_fee=?, meal_plan=?, status=?, notes=? WHERE id=? AND organization_id=?`,
        data.dormitoryId||null, data.roomNumber||null, data.bedNumber||null, data.checkInDate||null,
        data.checkOutDate||null, data.boardingFee||0, data.mealPlan||'full', data.status||'active',
        data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Discipline Records ────────────────────────────────────────────────────
  'dara:getDisciplineRecords': async (_, { orgId, studentId, severity, resolved, token } = {}) => {
    try {
      const actor = getActor(token)
      if (actor?.role === 'parent' || actor?.role === 'student') return ERR_FORBIDDEN
      let q = `SELECT dr.*, s.full_name as student_name, s.student_id as student_no,
                      c.name as class_name, u.full_name as reporter_name
               FROM discipline_records dr
               JOIN students s ON dr.student_id = s.id
               LEFT JOIN classes c ON s.class_id = c.id
               LEFT JOIN users u ON dr.reported_by = u.id
               WHERE dr.organization_id = ?`
      const p = [orgId]
      if (studentId !== undefined && studentId !== null && studentId !== '') { q += ' AND dr.student_id = ?'; p.push(studentId) }
      if (severity)  { q += ' AND dr.severity = ?';          p.push(severity) }
      if (resolved !== undefined && resolved !== '') { q += ' AND dr.resolved = ?'; p.push(resolved ? 1 : 0) }
      q += ' ORDER BY dr.incident_date DESC'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:createDisciplineRecord': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const result = dbRun(`
        INSERT INTO discipline_records (organization_id, student_id, incident_date, incident_type,
          severity, description, action_taken, reported_by, resolved, parent_notified, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.studentId, data.incidentDate, data.incidentType||'misconduct',
         data.severity||'minor', data.description, data.actionTaken||null,
         data.reportedBy||null, data.resolved ? 1 : 0, data.parentNotified ? 1 : 0, data.notes||null)
      audit(data.orgId, null, 'staff', 'CREATE_DISCIPLINE_RECORD', 'discipline_records', result.lastInsertRowid, { studentId: data.studentId, type: data.incidentType })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:updateDisciplineRecord': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`UPDATE discipline_records SET incident_date=?, incident_type=?, severity=?, description=?,
              action_taken=?, resolved=?, resolved_date=?, parent_notified=?, notes=?
             WHERE id=? AND organization_id=?`,
        data.incidentDate, data.incidentType||'misconduct', data.severity||'minor',
        data.description, data.actionTaken||null, data.resolved ? 1 : 0,
        data.resolvedDate||null, data.parentNotified ? 1 : 0, data.notes||null,
        data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:deleteDisciplineRecord': async (_, { id, orgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      dbRun('DELETE FROM discipline_records WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Feeding Management ────────────────────────────────────────────────────
  'dara:getFeedingRecords': async (_, { orgId, dormitoryId, startDate, endDate, token } = {}) => {
    try {
      const actor = getActor(token)
      if (actor?.role === 'parent' || actor?.role === 'student') return ERR_FORBIDDEN
      let q = `SELECT fr.*, d.name as dormitory_name, u.full_name as recorder_name
               FROM feeding_records fr
               LEFT JOIN dormitories d ON fr.dormitory_id = d.id
               LEFT JOIN users u ON fr.recorded_by = u.id
               WHERE fr.organization_id = ?`
      const p = [orgId]
      if (dormitoryId) { q += ' AND fr.dormitory_id = ?'; p.push(dormitoryId) }
      if (startDate)   { q += ' AND fr.date >= ?';        p.push(startDate) }
      if (endDate)     { q += ' AND fr.date <= ?';        p.push(endDate) }
      q += ' ORDER BY fr.date DESC, fr.meal_type'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:saveFeedingRecord': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`
        INSERT INTO feeding_records (organization_id, dormitory_id, date, meal_type, student_count, menu, cost, notes, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(organization_id, dormitory_id, date, meal_type)
        DO UPDATE SET student_count=excluded.student_count, menu=excluded.menu, cost=excluded.cost, notes=excluded.notes
      `, data.orgId, data.dormitoryId||null, data.date, data.mealType||'breakfast',
         data.studentCount||0, data.menu||null, data.cost||0, data.notes||null, data.recordedBy||null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:deleteFeedingRecord': async (_, { id, orgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      dbRun('DELETE FROM feeding_records WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
