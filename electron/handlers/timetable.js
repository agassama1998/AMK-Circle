const { dbAll, dbRun, audit } = require('../database/db')
const { denyReadOnly } = require('./_rbac')

module.exports = {
  'timetable:getAll': async (_, { orgId, classId, teacherId, dayOfWeek, academicYear } = {}) => {
    try {
      let q = `
        SELECT ts.*, c.name as class_name, s.name as subject_name,
               t.full_name as teacher_name, t.employee_id
        FROM timetable_slots ts
        LEFT JOIN classes c ON ts.class_id = c.id
        LEFT JOIN subjects s ON ts.subject_id = s.id
        LEFT JOIN teachers t ON ts.teacher_id = t.id
        WHERE ts.organization_id = ?
      `
      const p = [orgId]
      if (classId)      { q += ' AND ts.class_id = ?';     p.push(classId) }
      if (teacherId)    { q += ' AND ts.teacher_id = ?';   p.push(teacherId) }
      if (dayOfWeek)    { q += ' AND ts.day_of_week = ?';  p.push(dayOfWeek) }
      if (academicYear) { q += ' AND ts.academic_year = ?'; p.push(academicYear) }
      q += ' ORDER BY ts.day_of_week, ts.start_time'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'timetable:create': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const result = dbRun(`
        INSERT INTO timetable_slots (organization_id, class_id, subject_id, teacher_id,
          day_of_week, start_time, end_time, room, academic_year, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.classId||null, data.subjectId||null, data.teacherId||null,
         data.dayOfWeek, data.startTime, data.endTime, data.room||null,
         data.academicYear||null, data.notes||null)
      audit(data.orgId, null, 'staff', 'CREATE_TIMETABLE_SLOT', 'timetable_slots', result.lastInsertRowid, { day: data.dayOfWeek, time: data.startTime })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'timetable:update': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`
        UPDATE timetable_slots SET class_id=?, subject_id=?, teacher_id=?,
          day_of_week=?, start_time=?, end_time=?, room=?, academic_year=?, notes=?
        WHERE id=? AND organization_id=?
      `, data.classId||null, data.subjectId||null, data.teacherId||null,
         data.dayOfWeek, data.startTime, data.endTime, data.room||null,
         data.academicYear||null, data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'timetable:delete': async (_, { id, orgId, token }) => {
    const guard = denyReadOnly(token)
    if (guard) return guard
    try {
      dbRun('DELETE FROM timetable_slots WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
