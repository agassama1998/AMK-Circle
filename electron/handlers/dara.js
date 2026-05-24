const { dbGet, dbAll, dbRun, audit } = require('../database/db')

module.exports = {
  // ─── Hifz Progress ─────────────────────────────────────────────────────────
  'dara:getHifzProgress': async (_, { orgId, classId, search } = {}) => {
    try {
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

  'dara:getMilestones': async (_, { orgId, studentId }) => {
    try {
      const data = dbAll(`
        SELECT hm.*, t.full_name as verified_by_name
        FROM hifz_milestones hm LEFT JOIN teachers t ON hm.verified_by = t.id
        WHERE hm.organization_id = ? AND hm.student_id = ?
        ORDER BY hm.completed_date DESC
      `, orgId, studentId)
      return { success: true, data }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:addMilestone': async (_, data) => {
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
    try {
      dbRun(`UPDATE hifz_milestones SET milestone_type=?, juz_number=?, surah_name=?, pages_completed=?,
        completed_date=?, verified_by=?, grade=?, notes=? WHERE id=? AND organization_id=?`,
        data.milestoneType, data.juzNumber||null, data.surahName||null, data.pagesCompleted||null,
        data.completedDate||null, data.verifiedBy||null, data.grade||null, data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:deleteMilestone': async (_, { id, orgId }) => {
    try {
      dbRun('DELETE FROM hifz_milestones WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Dormitories ─────────────────────────────────────────────────────────
  'dara:getDormitories': async (_, { orgId } = {}) => {
    try {
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
    try {
      const result = dbRun(`INSERT INTO dormitories (organization_id, name, capacity, supervisor_id, gender, floor, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        data.orgId, data.name, data.capacity||10, data.supervisorId||null, data.gender||'male', data.floor||null, data.status||'active', data.notes||null)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:updateDormitory': async (_, data) => {
    try {
      dbRun(`UPDATE dormitories SET name=?, capacity=?, supervisor_id=?, gender=?, floor=?, status=?, notes=? WHERE id=? AND organization_id=?`,
        data.name, data.capacity||10, data.supervisorId||null, data.gender||'male', data.floor||null, data.status||'active', data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'dara:getAssignments': async (_, { orgId, dormitoryId, status } = {}) => {
    try {
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
    try {
      dbRun(`UPDATE boarding_assignments SET dormitory_id=?, room_number=?, bed_number=?, check_in_date=?, check_out_date=?, boarding_fee=?, meal_plan=?, status=?, notes=? WHERE id=? AND organization_id=?`,
        data.dormitoryId||null, data.roomNumber||null, data.bedNumber||null, data.checkInDate||null,
        data.checkOutDate||null, data.boardingFee||0, data.mealPlan||'full', data.status||'active',
        data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
