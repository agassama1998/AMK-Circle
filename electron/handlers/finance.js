const { dbGet, dbAll, dbRun, audit, nextReceiptNumber } = require('../database/db')

module.exports = {
  // ─── Payments ──────────────────────────────────────────────────────────────
  'finance:getPayments': async (_, { orgId, search, type, status, startDate, endDate, studentId } = {}) => {
    try {
      let q = `SELECT p.*, s.full_name as student_name, s.student_id as student_no
               FROM payments p LEFT JOIN students s ON p.student_id = s.id
               WHERE p.organization_id = ?`
      const params = [orgId]
      if (type)      { q += ' AND p.payment_type = ?'; params.push(type) }
      if (status)    { q += ' AND p.status = ?';       params.push(status) }
      if (studentId) { q += ' AND p.student_id = ?';   params.push(studentId) }
      if (startDate) { q += ' AND p.date >= ?';        params.push(startDate) }
      if (endDate)   { q += ' AND p.date <= ?';        params.push(endDate) }
      if (search)    {
        q += ' AND (p.person_name LIKE ? OR p.receipt_number LIKE ? OR p.person_phone LIKE ?)'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
      }
      q += ' ORDER BY p.created_at DESC'
      return { success: true, data: dbAll(q, params) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'finance:createPayment': async (_, data) => {
    try {
      const receiptNum = data.receiptNumber || nextReceiptNumber(data.orgId)
      const existing = dbGet('SELECT id FROM payments WHERE organization_id=? AND receipt_number=?', data.orgId, receiptNum)
      if (existing) return { success: false, message: 'Receipt number already exists' }

      const result = dbRun(`
        INSERT INTO payments (organization_id, receipt_number, person_name, person_email, person_phone,
          person_address, student_id, amount, payment_type, payment_method, status, description, notes, date, processed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, receiptNum, data.personName, data.personEmail||null, data.personPhone||null,
         data.personAddress||null, data.studentId||null, data.amount, data.paymentType,
         data.paymentMethod||'cash', data.status||'paid', data.description||null,
         data.notes||null, data.date||new Date().toISOString().split('T')[0], data.processedBy||null)

      audit(data.orgId, data.processedBy||null, 'staff', 'CREATE_PAYMENT', 'payments', result.lastInsertRowid,
        { receipt: receiptNum, amount: data.amount, type: data.paymentType })
      return { success: true, id: result.lastInsertRowid, receiptNumber: receiptNum }
    } catch (e) { return { success: false, message: e.message } }
  },

  'finance:updatePayment': async (_, data) => {
    try {
      dbRun(`UPDATE payments SET person_name=?, person_email=?, person_phone=?, person_address=?,
        student_id=?, amount=?, payment_type=?, payment_method=?, status=?, description=?, notes=?, date=?
        WHERE id=? AND organization_id=?`,
        data.personName, data.personEmail||null, data.personPhone||null, data.personAddress||null,
        data.studentId||null, data.amount, data.paymentType, data.paymentMethod||'cash',
        data.status||'paid', data.description||null, data.notes||null, data.date, data.id, data.orgId)
      audit(data.orgId, null, 'staff', 'UPDATE_PAYMENT', 'payments', data.id, { amount: data.amount })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'finance:deletePayment': async (_, { id, orgId }) => {
    try {
      dbRun('DELETE FROM payments WHERE id=? AND organization_id=?', id, orgId)
      audit(orgId, null, 'admin', 'DELETE_PAYMENT', 'payments', id, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'finance:getNextReceiptNumber': async (_, { orgId }) => {
    try {
      return { success: true, receiptNumber: nextReceiptNumber(orgId) }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Expenses ──────────────────────────────────────────────────────────────
  'finance:getExpenses': async (_, { orgId, category, startDate, endDate, search } = {}) => {
    try {
      let q = 'SELECT * FROM expenses WHERE organization_id = ?'
      const p = [orgId]
      if (category)  { q += ' AND category = ?'; p.push(category) }
      if (startDate) { q += ' AND date >= ?';    p.push(startDate) }
      if (endDate)   { q += ' AND date <= ?';    p.push(endDate) }
      if (search)    { q += ' AND (description LIKE ? OR vendor LIKE ?)'; p.push(`%${search}%`, `%${search}%`) }
      q += ' ORDER BY date DESC'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'finance:createExpense': async (_, data) => {
    try {
      const result = dbRun(`
        INSERT INTO expenses (organization_id, category, description, amount, date, vendor, receipt_ref, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.category, data.description, data.amount,
         data.date||new Date().toISOString().split('T')[0], data.vendor||null,
         data.receiptRef||null, data.status||'approved', data.notes||null)
      audit(data.orgId, null, 'staff', 'CREATE_EXPENSE', 'expenses', result.lastInsertRowid, { amount: data.amount, category: data.category })
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'finance:updateExpense': async (_, data) => {
    try {
      dbRun(`UPDATE expenses SET category=?, description=?, amount=?, date=?, vendor=?, receipt_ref=?, status=?, notes=? WHERE id=? AND organization_id=?`,
        data.category, data.description, data.amount, data.date, data.vendor||null,
        data.receiptRef||null, data.status||'approved', data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'finance:deleteExpense': async (_, { id, orgId }) => {
    try {
      dbRun('DELETE FROM expenses WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Salaries ──────────────────────────────────────────────────────────────
  'finance:getSalaries': async (_, { orgId, month, teacherId } = {}) => {
    try {
      let q = `SELECT s.*, t.full_name as teacher_name, t.employee_id, t.specialization
               FROM salaries s JOIN teachers t ON s.teacher_id = t.id
               WHERE s.organization_id = ?`
      const p = [orgId]
      if (month)     { q += ' AND s.month = ?';      p.push(month) }
      if (teacherId) { q += ' AND s.teacher_id = ?'; p.push(teacherId) }
      q += ' ORDER BY s.month DESC, t.full_name'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'finance:createSalary': async (_, data) => {
    try {
      const net = (parseFloat(data.baseAmount)||0) + (parseFloat(data.allowances)||0) - (parseFloat(data.deductions)||0)
      const result = dbRun(`
        INSERT OR REPLACE INTO salaries (organization_id, teacher_id, month, base_amount, allowances, deductions, net_amount, payment_date, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.teacherId, data.month, data.baseAmount||0, data.allowances||0,
         data.deductions||0, net, data.paymentDate||null, data.status||'paid', data.notes||null)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'finance:updateSalary': async (_, data) => {
    try {
      const net = (parseFloat(data.baseAmount)||0) + (parseFloat(data.allowances)||0) - (parseFloat(data.deductions)||0)
      dbRun(`UPDATE salaries SET base_amount=?, allowances=?, deductions=?, net_amount=?, payment_date=?, status=?, notes=? WHERE id=? AND organization_id=?`,
        data.baseAmount||0, data.allowances||0, data.deductions||0, net, data.paymentDate||null, data.status||'paid', data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Financial Summary ─────────────────────────────────────────────────────
  'finance:getSummary': async (_, { orgId, startDate, endDate } = {}) => {
    try {
      let pQ = 'SELECT payment_type, SUM(amount) as total, COUNT(*) as count FROM payments WHERE organization_id = ?'
      const pP = [orgId]
      if (startDate) { pQ += ' AND date >= ?'; pP.push(startDate) }
      if (endDate)   { pQ += ' AND date <= ?'; pP.push(endDate) }
      pQ += ' GROUP BY payment_type'
      const byType = dbAll(pQ, pP)

      let eQ = 'SELECT category, SUM(amount) as total FROM expenses WHERE organization_id = ?'
      const eP = [orgId]
      if (startDate) { eQ += ' AND date >= ?'; eP.push(startDate) }
      if (endDate)   { eQ += ' AND date <= ?'; eP.push(endDate) }
      eQ += ' GROUP BY category'
      const expenses = dbAll(eQ, eP)

      // Monthly trend (last 6 months)
      const now = new Date()
      const monthly = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
        const income = dbGet('SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE organization_id=? AND date LIKE ?', orgId, `${m}%`)
        const expense = dbGet('SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE organization_id=? AND date LIKE ?', orgId, `${m}%`)
        monthly.push({ month: m, income: income?.t||0, expense: expense?.t||0 })
      }

      const totalIncome  = byType.reduce((s, r) => s + (r.total||0), 0)
      const totalExpense = expenses.reduce((s, r) => s + (r.total||0), 0)
      const totalSalary  = dbGet('SELECT COALESCE(SUM(net_amount),0) as t FROM salaries WHERE organization_id=?', orgId)

      return { success: true, data: { byType, expenses, monthly, totalIncome, totalExpense, totalSalary: totalSalary?.t||0 } }
    } catch (e) { return { success: false, message: e.message } }
  },
}
