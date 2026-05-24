const { dbGet, dbAll, dbRun, audit } = require('../database/db')

module.exports = {
  'orgs:getAll': async (_, { search } = {}) => {
    try {
      let q = `SELECT o.*,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.is_active = 1) as user_count,
        (SELECT COUNT(*) FROM students s WHERE s.organization_id = o.id AND s.status = 'active') as student_count,
        (SELECT COUNT(*) FROM teachers t WHERE t.organization_id = o.id AND t.status = 'active') as teacher_count,
        (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.organization_id = o.id) as total_revenue
        FROM organizations o`
      const params = []
      if (search) { q += ` WHERE o.name LIKE ? OR o.city LIKE ? OR o.org_type LIKE ?`; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      q += ' ORDER BY o.name'
      return { success: true, data: dbAll(q, params) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'orgs:getById': async (_, { id }) => {
    try {
      const org = dbGet('SELECT * FROM organizations WHERE id = ?', id)
      if (!org) return { success: false, message: 'Organization not found' }
      return { success: true, data: org }
    } catch (e) { return { success: false, message: e.message } }
  },

  'orgs:create': async (_, data) => {
    try {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50)
      const existing = dbGet('SELECT id FROM organizations WHERE slug = ?', slug)
      const finalSlug = existing ? `${slug}-${Date.now()}` : slug

      const result = dbRun(`
        INSERT INTO organizations (name, slug, org_type, address, city, state, country, email, phone, website, timezone, primary_color, secondary_color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.name, finalSlug, data.orgType || 'Islamic Community Center',
         data.address || null, data.city || null, data.state || null, data.country || 'USA',
         data.email || null, data.phone || null, data.website || null,
         data.timezone || 'America/Chicago', data.primaryColor || '#15803d', data.secondaryColor || '#d97706')

      const orgId = result.lastInsertRowid

      // Create default settings
      dbRun(`INSERT OR IGNORE INTO org_settings (organization_id, receipt_prefix) VALUES (?, ?)`,
        orgId, (data.name.slice(0, 4).toUpperCase() || 'ORG'))

      // Create default prayer times
      dbRun(`INSERT OR IGNORE INTO prayer_times (organization_id, schedule_name) VALUES (?, 'Default')`, orgId)

      audit(null, null, 'super_admin', 'CREATE_ORG', 'organizations', orgId, { name: data.name })
      return { success: true, id: orgId }
    } catch (e) { return { success: false, message: e.message } }
  },

  'orgs:update': async (_, data) => {
    try {
      dbRun(`
        UPDATE organizations SET name=?, org_type=?, address=?, city=?, state=?, country=?, email=?, phone=?,
          website=?, timezone=?, primary_color=?, secondary_color=?, subscription_status=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `, data.name, data.orgType, data.address||null, data.city||null, data.state||null,
         data.country||'USA', data.email||null, data.phone||null, data.website||null,
         data.timezone||'America/Chicago', data.primaryColor||'#15803d', data.secondaryColor||'#d97706',
         data.subscriptionStatus||'active', data.id)
      audit(null, null, 'super_admin', 'UPDATE_ORG', 'organizations', data.id, { name: data.name })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'orgs:toggleActive': async (_, { id }) => {
    try {
      const org = dbGet('SELECT is_active FROM organizations WHERE id = ?', id)
      if (!org) return { success: false, message: 'Not found' }
      dbRun('UPDATE organizations SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', org.is_active ? 0 : 1, id)
      return { success: true, is_active: !org.is_active }
    } catch (e) { return { success: false, message: e.message } }
  },

  'orgs:getStats': async (_, { id }) => {
    try {
      const students  = dbGet(`SELECT COUNT(*) as c FROM students WHERE organization_id=? AND status='active'`, id)
      const teachers  = dbGet(`SELECT COUNT(*) as c FROM teachers WHERE organization_id=? AND status='active'`, id)
      const classes   = dbGet(`SELECT COUNT(*) as c FROM classes WHERE organization_id=?`, id)
      const payments  = dbGet(`SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE organization_id=?`, id)
      const events    = dbGet(`SELECT COUNT(*) as c FROM events WHERE organization_id=? AND status='upcoming'`, id)
      return { success: true, data: {
        students: students?.c || 0,
        teachers: teachers?.c || 0,
        classes:  classes?.c  || 0,
        revenue:  payments?.total || 0,
        events:   events?.c   || 0,
      }}
    } catch (e) { return { success: false, message: e.message } }
  },
}
