const { contextBridge, ipcRenderer } = require('electron')

const ipc = (channel, data) => ipcRenderer.invoke(channel, data)

contextBridge.exposeInMainWorld('api', {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  auth: {
    login:          (d) => ipc('auth:login', d),
    logout:         (d) => ipc('auth:logout', d),
    changePassword: (d) => ipc('auth:changePassword', d),
    getMe:          (d) => ipc('auth:getMe', d),
  },

  // ─── Organizations ────────────────────────────────────────────────────────
  orgs: {
    getAll:       (d) => ipc('orgs:getAll', d),
    getById:      (d) => ipc('orgs:getById', d),
    create:       (d) => ipc('orgs:create', d),
    update:       (d) => ipc('orgs:update', d),
    toggleActive: (d) => ipc('orgs:toggleActive', d),
    getStats:     (d) => ipc('orgs:getStats', d),
  },

  // ─── Users ────────────────────────────────────────────────────────────────
  users: {
    getAll:        (d) => ipc('users:getAll', d),
    create:        (d) => ipc('users:create', d),
    update:        (d) => ipc('users:update', d),
    delete:        (d) => ipc('users:delete', d),
    resetPassword: (d) => ipc('users:resetPassword', d),
  },

  // ─── Students ─────────────────────────────────────────────────────────────
  students: {
    getAll:   (d) => ipc('students:getAll', d),
    getById:  (d) => ipc('students:getById', d),
    create:   (d) => ipc('students:create', d),
    update:   (d) => ipc('students:update', d),
    delete:   (d) => ipc('students:delete', d),
  },

  // ─── Teachers ─────────────────────────────────────────────────────────────
  teachers: {
    getAll:  (d) => ipc('teachers:getAll', d),
    create:  (d) => ipc('teachers:create', d),
    update:  (d) => ipc('teachers:update', d),
    delete:  (d) => ipc('teachers:delete', d),
  },

  // ─── Classes ──────────────────────────────────────────────────────────────
  classes: {
    getAll:  (d) => ipc('classes:getAll', d),
    create:  (d) => ipc('classes:create', d),
    update:  (d) => ipc('classes:update', d),
    delete:  (d) => ipc('classes:delete', d),
  },

  // ─── Attendance ───────────────────────────────────────────────────────────
  attendance: {
    getByDate:    (d) => ipc('attendance:getByDate', d),
    getByStudent: (d) => ipc('attendance:getByStudent', d),
    save:         (d) => ipc('attendance:save', d),
    getStats:     (d) => ipc('attendance:getStats', d),
  },

  // ─── Quran Progress ───────────────────────────────────────────────────────
  quran: {
    getByStudent: (d) => ipc('quran:getByStudent', d),
    add:          (d) => ipc('quran:add', d),
    update:       (d) => ipc('quran:update', d),
    delete:       (d) => ipc('quran:delete', d),
  },

  // ─── Masjid ───────────────────────────────────────────────────────────────
  masjid: {
    getPrayerTimes:       (d) => ipc('masjid:getPrayerTimes', d),
    updatePrayerTimes:    (d) => ipc('masjid:updatePrayerTimes', d),
    getEvents:            (d) => ipc('masjid:getEvents', d),
    createEvent:          (d) => ipc('masjid:createEvent', d),
    updateEvent:          (d) => ipc('masjid:updateEvent', d),
    deleteEvent:          (d) => ipc('masjid:deleteEvent', d),
    getAnnouncements:     (d) => ipc('masjid:getAnnouncements', d),
    createAnnouncement:   (d) => ipc('masjid:createAnnouncement', d),
    updateAnnouncement:   (d) => ipc('masjid:updateAnnouncement', d),
    deleteAnnouncement:   (d) => ipc('masjid:deleteAnnouncement', d),
    getKhutbah:           (d) => ipc('masjid:getKhutbah', d),
    createKhutbah:        (d) => ipc('masjid:createKhutbah', d),
    updateKhutbah:        (d) => ipc('masjid:updateKhutbah', d),
    deleteKhutbah:        (d) => ipc('masjid:deleteKhutbah', d),
    getVolunteers:        (d) => ipc('masjid:getVolunteers', d),
    createVolunteer:      (d) => ipc('masjid:createVolunteer', d),
    updateVolunteer:      (d) => ipc('masjid:updateVolunteer', d),
    deleteVolunteer:      (d) => ipc('masjid:deleteVolunteer', d),
  },

  // ─── Finance ──────────────────────────────────────────────────────────────
  finance: {
    getPayments:          (d) => ipc('finance:getPayments', d),
    createPayment:        (d) => ipc('finance:createPayment', d),
    updatePayment:        (d) => ipc('finance:updatePayment', d),
    deletePayment:        (d) => ipc('finance:deletePayment', d),
    getExpenses:          (d) => ipc('finance:getExpenses', d),
    createExpense:        (d) => ipc('finance:createExpense', d),
    updateExpense:        (d) => ipc('finance:updateExpense', d),
    deleteExpense:        (d) => ipc('finance:deleteExpense', d),
    getSalaries:          (d) => ipc('finance:getSalaries', d),
    createSalary:         (d) => ipc('finance:createSalary', d),
    updateSalary:         (d) => ipc('finance:updateSalary', d),
    getSummary:           (d) => ipc('finance:getSummary', d),
    getNextReceiptNumber: (d) => ipc('finance:getNextReceiptNumber', d),
  },

  // ─── Dara (Hifz & Boarding) ───────────────────────────────────────────────
  dara: {
    getHifzProgress:      (d) => ipc('dara:getHifzProgress', d),
    getMilestones:        (d) => ipc('dara:getMilestones', d),
    addMilestone:         (d) => ipc('dara:addMilestone', d),
    updateMilestone:      (d) => ipc('dara:updateMilestone', d),
    deleteMilestone:      (d) => ipc('dara:deleteMilestone', d),
    getDormitories:       (d) => ipc('dara:getDormitories', d),
    createDormitory:      (d) => ipc('dara:createDormitory', d),
    updateDormitory:      (d) => ipc('dara:updateDormitory', d),
    getAssignments:       (d) => ipc('dara:getAssignments', d),
    assignBoarding:       (d) => ipc('dara:assignBoarding', d),
    updateAssignment:     (d) => ipc('dara:updateAssignment', d),
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  reports: {
    getDashboardStats:    (d) => ipc('reports:getDashboardStats', d),
    getFinancialReport:   (d) => ipc('reports:getFinancialReport', d),
    getStudentReport:     (d) => ipc('reports:getStudentReport', d),
    getAttendanceReport:  (d) => ipc('reports:getAttendanceReport', d),
    getHifzReport:        (d) => ipc('reports:getHifzReport', d),
    getAuditLogs:         (d) => ipc('reports:getAuditLogs', d),
    getSuperStats:        ()  => ipc('reports:getSuperStats'),
  },

  // ─── Settings ─────────────────────────────────────────────────────────────
  settings: {
    getOrgSettings:    (d) => ipc('settings:getOrgSettings', d),
    updateOrgSettings: (d) => ipc('settings:updateOrgSettings', d),
    getOrg:            (d) => ipc('settings:getOrg', d),
    updateOrg:         (d) => ipc('settings:updateOrg', d),
  },

  // ─── System ───────────────────────────────────────────────────────────────
  dialog: {
    showSave: (d) => ipc('dialog:showSave', d),
    showOpen: (d) => ipc('dialog:showOpen', d),
  },
  shell: {
    openPath: (d) => ipc('shell:openPath', d),
  },
  fs: {
    writeBase64: (d) => ipc('fs:writeBase64', d),
  },
  db: {
    backup:  () => ipc('db:backup'),
    restore: () => ipc('db:restore'),
  },
  app: {
    getVersion: () => ipc('app:getVersion'),
  },
})
