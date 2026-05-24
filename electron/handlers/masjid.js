const { dbGet, dbAll, dbRun, audit } = require('../database/db')

module.exports = {
  // ─── Prayer Times ──────────────────────────────────────────────────────────
  'masjid:getPrayerTimes': async (_, { orgId } = {}) => {
    try {
      const data = dbGet('SELECT * FROM prayer_times WHERE organization_id = ? ORDER BY id DESC LIMIT 1', orgId)
      return { success: true, data: data || {} }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:updatePrayerTimes': async (_, data) => {
    try {
      const existing = dbGet('SELECT id FROM prayer_times WHERE organization_id = ? AND schedule_name = ?', data.orgId, data.scheduleName || 'Default')
      if (existing) {
        dbRun(`UPDATE prayer_times SET fajr=?, fajr_iqamah=?, sunrise=?, dhuhr=?, dhuhr_iqamah=?,
          asr=?, asr_iqamah=?, maghrib=?, maghrib_iqamah=?, isha=?, isha_iqamah=?,
          jumu_ah=?, jumu_ah_iqamah=?, second_jumu_ah=?, effective_date=?, is_ramadan=?, updated_at=CURRENT_TIMESTAMP
          WHERE id=?`,
          data.fajr||null, data.fajrIqamah||null, data.sunrise||null,
          data.dhuhr||null, data.dhuhrIqamah||null, data.asr||null, data.asrIqamah||null,
          data.maghrib||null, data.maghribIqamah||null, data.isha||null, data.ishaIqamah||null,
          data.jumuah||null, data.jumuahIqamah||null, data.secondJumuah||null,
          data.effectiveDate||null, data.isRamadan ? 1 : 0, existing.id)
      } else {
        dbRun(`INSERT INTO prayer_times (organization_id, schedule_name, fajr, fajr_iqamah, sunrise,
          dhuhr, dhuhr_iqamah, asr, asr_iqamah, maghrib, maghrib_iqamah, isha, isha_iqamah,
          jumu_ah, jumu_ah_iqamah, second_jumu_ah, effective_date, is_ramadan)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          data.orgId, data.scheduleName||'Default', data.fajr||null, data.fajrIqamah||null, data.sunrise||null,
          data.dhuhr||null, data.dhuhrIqamah||null, data.asr||null, data.asrIqamah||null,
          data.maghrib||null, data.maghribIqamah||null, data.isha||null, data.ishaIqamah||null,
          data.jumuah||null, data.jumuahIqamah||null, data.secondJumuah||null,
          data.effectiveDate||null, data.isRamadan ? 1 : 0)
      }
      audit(data.orgId, null, 'admin', 'UPDATE_PRAYER_TIMES', 'prayer_times', null, null)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Events ────────────────────────────────────────────────────────────────
  'masjid:getEvents': async (_, { orgId, status, category } = {}) => {
    try {
      let q = 'SELECT * FROM events WHERE organization_id = ?'
      const p = [orgId]
      if (status)   { q += ' AND status = ?';   p.push(status) }
      if (category) { q += ' AND category = ?'; p.push(category) }
      q += ' ORDER BY date DESC, time DESC'
      return { success: true, data: dbAll(q, p) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:createEvent': async (_, data) => {
    try {
      const result = dbRun(`
        INSERT INTO events (organization_id, title, description, date, time, end_date, end_time, location, category, status, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.title, data.description||null, data.date, data.time||null,
         data.endDate||null, data.endTime||null, data.location||null,
         data.category||'general', data.status||'upcoming', data.isPublic!==false ? 1 : 0)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:updateEvent': async (_, data) => {
    try {
      dbRun(`UPDATE events SET title=?, description=?, date=?, time=?, end_date=?, end_time=?, location=?, category=?, status=?, is_public=? WHERE id=? AND organization_id=?`,
        data.title, data.description||null, data.date, data.time||null, data.endDate||null,
        data.endTime||null, data.location||null, data.category||'general',
        data.status||'upcoming', data.isPublic!==false ? 1 : 0, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:deleteEvent': async (_, { id, orgId }) => {
    try {
      dbRun('DELETE FROM events WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Announcements ─────────────────────────────────────────────────────────
  'masjid:getAnnouncements': async (_, { orgId } = {}) => {
    try {
      return { success: true, data: dbAll('SELECT * FROM announcements WHERE organization_id=? ORDER BY created_at DESC', orgId) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:createAnnouncement': async (_, data) => {
    try {
      const result = dbRun(`
        INSERT INTO announcements (organization_id, title, content, type, audience, published, date, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.title, data.content, data.type||'general', data.audience||'all',
         data.published!==false ? 1 : 0, data.date||null, data.expiresAt||null)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:updateAnnouncement': async (_, data) => {
    try {
      dbRun(`UPDATE announcements SET title=?, content=?, type=?, audience=?, published=?, date=?, expires_at=? WHERE id=? AND organization_id=?`,
        data.title, data.content, data.type||'general', data.audience||'all',
        data.published!==false ? 1 : 0, data.date||null, data.expiresAt||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:deleteAnnouncement': async (_, { id, orgId }) => {
    try {
      dbRun('DELETE FROM announcements WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Khutbah ───────────────────────────────────────────────────────────────
  'masjid:getKhutbah': async (_, { orgId } = {}) => {
    try {
      return { success: true, data: dbAll('SELECT * FROM khutbah WHERE organization_id=? ORDER BY date DESC', orgId) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:createKhutbah': async (_, data) => {
    try {
      const result = dbRun(`
        INSERT INTO khutbah (organization_id, title, speaker, date, language, topic, description, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, data.orgId, data.title, data.speaker||null, data.date, data.language||'English',
         data.topic||null, data.description||null, data.notes||null)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:updateKhutbah': async (_, data) => {
    try {
      dbRun(`UPDATE khutbah SET title=?, speaker=?, date=?, language=?, topic=?, description=?, notes=? WHERE id=? AND organization_id=?`,
        data.title, data.speaker||null, data.date, data.language||'English',
        data.topic||null, data.description||null, data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:deleteKhutbah': async (_, { id, orgId }) => {
    try {
      dbRun('DELETE FROM khutbah WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  // ─── Volunteers ─────────────────────────────────────────────────────────────
  'masjid:getVolunteers': async (_, { orgId } = {}) => {
    try {
      return { success: true, data: dbAll('SELECT * FROM volunteers WHERE organization_id=? ORDER BY full_name', orgId) }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:createVolunteer': async (_, data) => {
    try {
      const result = dbRun(`INSERT INTO volunteers (organization_id, full_name, email, phone, skills, availability, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        data.orgId, data.fullName, data.email||null, data.phone||null, data.skills||null, data.availability||null, data.status||'active', data.notes||null)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:updateVolunteer': async (_, data) => {
    try {
      dbRun(`UPDATE volunteers SET full_name=?, email=?, phone=?, skills=?, availability=?, status=?, notes=? WHERE id=? AND organization_id=?`,
        data.fullName, data.email||null, data.phone||null, data.skills||null, data.availability||null, data.status||'active', data.notes||null, data.id, data.orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },

  'masjid:deleteVolunteer': async (_, { id, orgId }) => {
    try {
      dbRun('DELETE FROM volunteers WHERE id=? AND organization_id=?', id, orgId)
      return { success: true }
    } catch (e) { return { success: false, message: e.message } }
  },
}
