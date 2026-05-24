const { dbGet, dbAll } = require('../database/db')

module.exports = {
  'reports:getDashboardStats': async (_, { orgId } = {}) => {
    try {
      const students      = dbGet(`SELECT COUNT(*) as c FROM students WHERE organization_id=? AND status='active'`, orgId)
      const teachers      = dbGet(`SELECT COUNT(*) as c FROM teachers WHERE organization_id=? AND status='active'`, orgId)
      const classes       = dbGet(`SELECT COUNT(*) as c FROM classes WHERE organization_id=? AND status='active'`, orgId)
      const upcomingEvts  = dbGet(`SELECT COUNT(*) as c FROM events WHERE organization_id=? AND status='upcoming'`, orgId)
      const totalIncome   = dbGet(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE organization_id=?`, orgId)
      const totalDonations= dbGet(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE organization_id=? AND payment_type IN ('donation','zakat','sadaqah')`, orgId)
      const totalExpenses = dbGet(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE organization_id=?`, orgId)
      const recentPayments= dbAll(`SELECT * FROM payments WHERE organization_id=? ORDER BY created_at DESC LIMIT 8`, orgId)
      const recentStudents= dbAll(`SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id=c.id WHERE s.organization_id=? ORDER BY s.created_at DESC LIMIT 5`, orgId)

      // Today attendance
      const today = new Date().toISOString().split('T')[0]
      const todayAtt = dbGet(`SELECT COUNT(*) as c FROM attendance WHERE organization_id=? AND date=? AND status='present'`, orgId, today)

      // Monthly trend last 6 months
      const now = new Date()
      const monthlyTrend = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
        const label = d.toLocaleString('default', { month: 'short' })
        const income  = dbGet(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE organization_id=? AND date LIKE ?`, orgId, `${m}%`)
        const expense = dbGet(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE organization_id=? AND date LIKE ?`, orgId, `${m}%`)
        monthlyTrend.push({ month: label, income: income?.t||0, expense: expense?.t||0 })
      }

      // Payment breakdown by type
      const paymentByType = dbAll(`SELECT payment_type, COALESCE(SUM(amount),0) as total FROM payments WHERE organization_id=? GROUP BY payment_type`, orgId)

      // Attendance this week
      const weekAtt = dbAll(`
        SELECT date, COUNT(CASE WHEN status='present' THEN 1 END) as present,
               COUNT(CASE WHEN status='absent' THEN 1 END) as absent
        FROM attendance WHERE organization_id=? AND date >= date('now', '-7 days')
        GROUP BY date ORDER BY date
      `, orgId)

      return { success: true, data: {
        totalStudents:  students?.c  || 0,
        totalTeachers:  teachers?.c  || 0,
        totalClasses:   classes?.c   || 0,
        upcomingEvents: upcomingEvts?.c || 0,
        totalIncome:    totalIncome?.t   || 0,
        totalDonations: totalDonations?.t || 0,
        totalExpenses:  totalExpenses?.t  || 0,
        todayPresent:   todayAtt?.c || 0,
        netBalance:     (totalIncome?.t||0) - (totalExpenses?.t||0),
        recentPayments, recentStudents,
        monthlyTrend, paymentByType, weekAtt,
      }}
    } catch (e) { return { success: false, message: e.message } }
  },

  'reports:getFinancialReport': async (_, { orgId, startDate, endDate, type } = {}) => {
    try {
      let q = 'SELECT * FROM payments WHERE organization_id = ?'
      const p = [orgId]
      if (startDate) { q += ' AND date >= ?'; p.push(startDate) }
      if (endDate)   { q += ' AND date <= ?'; p.push(endDate) }
      if (type)      { q += ' AND payment_type = ?'; p.push(type) }
      q += ' ORDER BY date DESC'
      const payments = dbAll(q, p)

      const summary = {}
      payments.forEach(pay => {
        if (!summary[pay.payment_type]) summary[pay.payment_type] = { type: pay.payment_type, count: 0, total: 0 }
        summary[pay.payment_type].count++
        summary[pay.payment_type].total += pay.amount
      })

      let eQ = 'SELECT * FROM expenses WHERE organization_id = ?'
      const eP = [orgId]
      if (startDate) { eQ += ' AND date >= ?'; eP.push(startDate) }
      if (endDate)   { eQ += ' AND date <= ?'; eP.push(endDate) }
      eQ += ' ORDER BY date DESC'
      const expenses = dbAll(eQ, eP)

      return { success: true, data: { payments, summary: Object.values(summary), expenses } }
    } catch (e) { return { success: false, message: e.message } }
  },

  'reports:getStudentReport': async (_, { orgId, classId, status } = {}) => {
    try {
      let q = `SELECT s.*, c.name as class_name FROM students s
               LEFT JOIN classes c ON s.class_id = c.id
               WHERE s.organization_id = ?`
      const p = [orgId]
      if (status)  { q += ' AND s.status = ?'; p.push(status || 'active') }
      if (classId) { q += ' AND s.class_id = ?'; p.push(classId) }
      q += ' ORDER BY s.full_name'
      const students = dbAll(q, p)

      const result = students.map(s => {
        const present = dbGet(`SELECT COUNT(*) as c FROM attendance WHERE student_id=? AND status='present'`, s.id)
        const absent  = dbGet(`SELECT COUNT(*) as c FROM attendance WHERE student_id=? AND status='absent'`, s.id)
        const late    = dbGet(`SELECT COUNT(*) as c FROM attendance WHERE student_id=? AND status='late'`, s.id)
        const quran   = dbGet(`SELECT COUNT(*) as c FROM quran_progress WHERE student_id=? AND organization_id=?`, s.id, orgId)
        const totalDays = (present?.c||0) + (absent?.c||0) + (late?.c||0)
        const attRate = totalDays > 0 ? Math.round(((present?.c||0) + (late?.c||0)) * 100 / totalDays) : 0
        return { ...s, present: present?.c||0, absent: absent?.c||0, late: late?.c||0, quranSessions: quran?.c||0, attendanceRate: attRate }
      })
      return { success: true, data: result }
    } catch (e) { return { success: false, message: e.message } }
  },

  'reports:getAttendanceReport': async (_, { orgId, classId, startDate, endDate } = {}) => {
    try {
      let q = `SELECT s.id, s.student_id, s.full_name, c.name as class_name
               FROM students s LEFT JOIN classes c ON s.class_id = c.id
               WHERE s.organization_id = ? AND s.status = 'active'`
      const p = [orgId]
      if (classId) { q += ' AND s.class_id = ?'; p.push(classId) }
      const students = dbAll(q, p)

      const result = students.map(s => {
        const params = [s.id]
        let filter = ''
        if (startDate) { filter += ' AND date >= ?'; params.push(startDate) }
        if (endDate)   { filter += ' AND date <= ?'; params.push(endDate) }
        const rows = dbAll(`SELECT status, COUNT(*) as cnt FROM attendance WHERE student_id=? ${filter} GROUP BY status`, params)
        const map = {}
        rows.forEach(r => { map[r.status] = r.cnt })
        const total = (map.present||0) + (map.absent||0) + (map.late||0) + (map.excused||0)
        const rate  = total > 0 ? Math.round(((map.present||0) + (map.late||0)) * 100 / total) : 0
        return { ...s, present: map.present||0, absent: map.absent||0, late: map.late||0, excused: map.excused||0, total, rate }
      })
      return { success: true, data: result }
    } catch (e) { return { success: false, message: e.message } }
  },

  'reports:getHifzReport': async (_, { orgId, classId } = {}) => {
    try {
      let q = `SELECT s.id, s.student_id, s.full_name, s.arabic_name, c.name as class_name,
        COUNT(DISTINCT hm.id) as milestones,
        COALESCE(MAX(hm.pages_completed), 0) as pages_memorized,
        COUNT(DISTINCT qp.id) as quran_sessions
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN hifz_milestones hm ON hm.student_id = s.id AND hm.organization_id = s.organization_id
        LEFT JOIN quran_progress qp ON qp.student_id = s.id AND qp.organization_id = s.organization_id
        WHERE s.organization_id = ? AND s.status = 'active'`
      const p = [orgId]
      if (classId) { q += ' AND s.class_id = ?'; p.push(classId) }
      q += ' GROUP BY s.id ORDER BY pages_memorized DESC'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'reports:getAuditLogs': async (_, { orgId, startDate, endDate, action, limit } = {}) => {
    try {
      let q = 'SELECT * FROM audit_logs WHERE (organization_id = ? OR organization_id IS NULL)'
      const p = [orgId]
      if (startDate) { q += ' AND created_at >= ?'; p.push(startDate) }
      if (endDate)   { q += ' AND created_at <= ?'; p.push(endDate) }
      if (action)    { q += ' AND action = ?';      p.push(action) }
      q += ` ORDER BY created_at DESC LIMIT ${limit || 200}`
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Super Admin Global Stats ──────────────────────────────────────────────
  'reports:getSuperStats': async () => {
    try {
      const orgs     = dbGet('SELECT COUNT(*) as c FROM organizations')
      const users    = dbGet('SELECT COUNT(*) as c FROM users WHERE is_active=1')
      const students = dbGet(`SELECT COUNT(*) as c FROM students WHERE status='active'`)
      const teachers = dbGet(`SELECT COUNT(*) as c FROM teachers WHERE status='active'`)
      const revenue  = dbGet('SELECT COALESCE(SUM(amount),0) as t FROM payments')
      const donations= dbGet(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE payment_type IN ('donation','zakat','sadaqah')`)

      // Per-org breakdown
      const orgBreakdown = dbAll(`
        SELECT o.name, o.org_type, o.city, o.state, o.is_active,
          (SELECT COUNT(*) FROM students s WHERE s.organization_id=o.id AND s.status='active') as students,
          (SELECT COUNT(*) FROM teachers t WHERE t.organization_id=o.id AND t.status='active') as teachers,
          (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.organization_id=o.id) as revenue
        FROM organizations o ORDER BY o.name
      `)

      // Monthly trend across all orgs
      const now = new Date()
      const monthlyTrend = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
        const label = d.toLocaleString('default', { month: 'short' })
        const income  = dbGet(`SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE date LIKE ?`, `${m}%`)
        monthlyTrend.push({ month: label, income: income?.t||0 })
      }

      return { success: true, data: {
        totalOrgs:      orgs?.c     || 0,
        totalUsers:     users?.c    || 0,
        totalStudents:  students?.c || 0,
        totalTeachers:  teachers?.c || 0,
        totalRevenue:   revenue?.t  || 0,
        totalDonations: donations?.t|| 0,
        orgBreakdown, monthlyTrend,
      }}
    } catch (e) { return { success: false, message: e.message } }
  },
}
