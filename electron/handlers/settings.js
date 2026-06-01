const { dbGet, dbRun, audit } = require('../database/db')
const { denyReadOnly } = require('./_rbac')

module.exports = {
  'settings:getOrgSettings': async (_, { orgId } = {}) => {
    try {
      const settings = dbGet('SELECT * FROM org_settings WHERE organization_id = ?', orgId)
      return { success: true, data: settings || {} }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ── Write: blocked for parent/student ────────────────────────────────────────
  'settings:updateOrgSettings': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      const existing = dbGet('SELECT id FROM org_settings WHERE organization_id = ?', data.orgId)
      if (existing) {
        dbRun(`UPDATE org_settings SET academic_year=?, currency=?, currency_symbol=?, date_format=?,
          language=?, email_notifications=?, auto_receipt=?, receipt_prefix=?, updated_at=CURRENT_TIMESTAMP
          WHERE organization_id=?`,
          data.academicYear||null, data.currency||'USD', data.currencySymbol||'$',
          data.dateFormat||'MM/DD/YYYY', data.language||'en',
          data.emailNotifications ? 1 : 0, data.autoReceipt !== false ? 1 : 0,
          data.receiptPrefix||'RCP', data.orgId)
      } else {
        dbRun(`INSERT INTO org_settings (organization_id, academic_year, currency, currency_symbol, date_format,
          language, email_notifications, auto_receipt, receipt_prefix)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          data.orgId, data.academicYear||null, data.currency||'USD', data.currencySymbol||'$',
          data.dateFormat||'MM/DD/YYYY', data.language||'en',
          data.emailNotifications ? 1 : 0, data.autoReceipt !== false ? 1 : 0, data.receiptPrefix||'RCP')
      }
      audit(data.orgId, null, 'admin', 'UPDATE_SETTINGS', 'org_settings', null, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'settings:getOrg': async (_, { orgId } = {}) => {
    try {
      const org = dbGet('SELECT * FROM organizations WHERE id = ?', orgId)
      if (!org) return { success: false, message: 'Organization not found' }
      return { success: true, data: org }
    } catch (e) { return { success: false, message: e.message } }
  },

  'settings:updateOrg': async (_, data) => {
    const guard = denyReadOnly(data.token)
    if (guard) return guard
    try {
      dbRun(`UPDATE organizations SET name=?, org_type=?, address=?, city=?, state=?, country=?,
        email=?, phone=?, website=?, timezone=?, primary_color=?, secondary_color=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?`,
        data.name, data.orgType, data.address||null, data.city||null, data.state||null,
        data.country||'USA', data.email||null, data.phone||null, data.website||null,
        data.timezone||'America/Chicago', data.primaryColor||'#15803d', data.secondaryColor||'#d97706',
        data.orgId)
      audit(data.orgId, null, 'admin', 'UPDATE_ORG_PROFILE', 'organizations', data.orgId, { name: data.name })
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
