/**
 * AMK Circle — Browser API Shim
 *
 * This script is injected into index.html by the Express server at runtime.
 * It defines window.api using fetch() calls so the React app works identically
 * in the browser (Docker/web mode) as it does through Electron's contextBridge.
 *
 * No changes to the React source code are needed.
 */
;(function () {
  'use strict'

  /** Read the JWT the AuthContext stored after login */
  function getToken () {
    try { return sessionStorage.getItem('amk_token') } catch { return null }
  }

  /**
   * Call an IPC-style channel over HTTP.
   * channel: 'auth:login', 'students:getAll', etc.
   * data:    plain object (same payload the Electron handler receives)
   */
  function call (channel, data) {
    var parts  = channel.split(':')
    var mod    = parts[0]
    var action = parts[1]
    var token  = getToken()

    // Merge the stored token into every request body so handlers that
    // verify it (auth:changePassword, auth:getMe, …) work transparently.
    var body = Object.assign({}, data)
    if (token && !body.token) body.token = token

    return fetch('/api/' + mod + '/' + action, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok && r.status !== 200) {
        return r.json().catch(function () {
          return { success: false, message: 'Server error ' + r.status }
        })
      }
      return r.json()
    }).catch(function (err) {
      return { success: false, message: err.message || 'Network error' }
    })
  }

  // ─── window.api — mirrors electron/preload.js exactly ──────────────────────

  window.api = {

    auth: {
      login:          function (d) { return call('auth:login', d) },
      logout:         function (d) { return call('auth:logout', d) },
      changePassword: function (d) { return call('auth:changePassword', d) },
      getMe:          function (d) { return call('auth:getMe', d) },
    },

    orgs: {
      getAll:       function (d) { return call('orgs:getAll', d) },
      getById:      function (d) { return call('orgs:getById', d) },
      create:       function (d) { return call('orgs:create', d) },
      update:       function (d) { return call('orgs:update', d) },
      toggleActive: function (d) { return call('orgs:toggleActive', d) },
      getStats:     function (d) { return call('orgs:getStats', d) },
    },

    users: {
      getAll:        function (d) { return call('users:getAll', d) },
      create:        function (d) { return call('users:create', d) },
      update:        function (d) { return call('users:update', d) },
      delete:        function (d) { return call('users:delete', d) },
      resetPassword: function (d) { return call('users:resetPassword', d) },
    },

    students: {
      getAll:  function (d) { return call('students:getAll', d) },
      getById: function (d) { return call('students:getById', d) },
      create:  function (d) { return call('students:create', d) },
      update:  function (d) { return call('students:update', d) },
      delete:  function (d) { return call('students:delete', d) },
    },

    parents: {
      getAll:  function (d) { return call('parents:getAll', d) },
      create:  function (d) { return call('parents:create', d) },
      update:  function (d) { return call('parents:update', d) },
      delete:  function (d) { return call('parents:delete', d) },
    },

    teachers: {
      getAll:  function (d) { return call('teachers:getAll', d) },
      create:  function (d) { return call('teachers:create', d) },
      update:  function (d) { return call('teachers:update', d) },
      delete:  function (d) { return call('teachers:delete', d) },
    },

    classes: {
      getAll:  function (d) { return call('classes:getAll', d) },
      create:  function (d) { return call('classes:create', d) },
      update:  function (d) { return call('classes:update', d) },
      delete:  function (d) { return call('classes:delete', d) },
    },

    subjects: {
      getAll:  function (d) { return call('subjects:getAll', d) },
      create:  function (d) { return call('subjects:create', d) },
      update:  function (d) { return call('subjects:update', d) },
      delete:  function (d) { return call('subjects:delete', d) },
    },

    exams: {
      getAll:         function (d) { return call('exams:getAll', d) },
      create:         function (d) { return call('exams:create', d) },
      update:         function (d) { return call('exams:update', d) },
      delete:         function (d) { return call('exams:delete', d) },
      getGrades:      function (d) { return call('exams:getGrades', d) },
      bulkSaveGrades: function (d) { return call('exams:bulkSaveGrades', d) },
    },

    attendance: {
      getByDate:    function (d) { return call('attendance:getByDate', d) },
      getByStudent: function (d) { return call('attendance:getByStudent', d) },
      save:         function (d) { return call('attendance:save', d) },
      getStats:     function (d) { return call('attendance:getStats', d) },
    },

    quran: {
      getByStudent: function (d) { return call('quran:getByStudent', d) },
      add:          function (d) { return call('quran:add', d) },
      update:       function (d) { return call('quran:update', d) },
      delete:       function (d) { return call('quran:delete', d) },
    },

    masjid: {
      getPrayerTimes:     function (d) { return call('masjid:getPrayerTimes', d) },
      updatePrayerTimes:  function (d) { return call('masjid:updatePrayerTimes', d) },
      getEvents:          function (d) { return call('masjid:getEvents', d) },
      createEvent:        function (d) { return call('masjid:createEvent', d) },
      updateEvent:        function (d) { return call('masjid:updateEvent', d) },
      deleteEvent:        function (d) { return call('masjid:deleteEvent', d) },
      getAnnouncements:   function (d) { return call('masjid:getAnnouncements', d) },
      createAnnouncement: function (d) { return call('masjid:createAnnouncement', d) },
      updateAnnouncement: function (d) { return call('masjid:updateAnnouncement', d) },
      deleteAnnouncement: function (d) { return call('masjid:deleteAnnouncement', d) },
      getKhutbah:         function (d) { return call('masjid:getKhutbah', d) },
      createKhutbah:      function (d) { return call('masjid:createKhutbah', d) },
      updateKhutbah:      function (d) { return call('masjid:updateKhutbah', d) },
      deleteKhutbah:      function (d) { return call('masjid:deleteKhutbah', d) },
      getVolunteers:      function (d) { return call('masjid:getVolunteers', d) },
      createVolunteer:    function (d) { return call('masjid:createVolunteer', d) },
      updateVolunteer:    function (d) { return call('masjid:updateVolunteer', d) },
      deleteVolunteer:    function (d) { return call('masjid:deleteVolunteer', d) },
    },

    finance: {
      getPayments:          function (d) { return call('finance:getPayments', d) },
      createPayment:        function (d) { return call('finance:createPayment', d) },
      updatePayment:        function (d) { return call('finance:updatePayment', d) },
      deletePayment:        function (d) { return call('finance:deletePayment', d) },
      getExpenses:          function (d) { return call('finance:getExpenses', d) },
      createExpense:        function (d) { return call('finance:createExpense', d) },
      updateExpense:        function (d) { return call('finance:updateExpense', d) },
      deleteExpense:        function (d) { return call('finance:deleteExpense', d) },
      getSalaries:          function (d) { return call('finance:getSalaries', d) },
      createSalary:         function (d) { return call('finance:createSalary', d) },
      updateSalary:         function (d) { return call('finance:updateSalary', d) },
      getSummary:           function (d) { return call('finance:getSummary', d) },
      getNextReceiptNumber: function (d) { return call('finance:getNextReceiptNumber', d) },
    },

    dara: {
      getHifzProgress:  function (d) { return call('dara:getHifzProgress', d) },
      getMilestones:    function (d) { return call('dara:getMilestones', d) },
      addMilestone:     function (d) { return call('dara:addMilestone', d) },
      updateMilestone:  function (d) { return call('dara:updateMilestone', d) },
      deleteMilestone:  function (d) { return call('dara:deleteMilestone', d) },
      getDormitories:   function (d) { return call('dara:getDormitories', d) },
      createDormitory:  function (d) { return call('dara:createDormitory', d) },
      updateDormitory:  function (d) { return call('dara:updateDormitory', d) },
      getAssignments:   function (d) { return call('dara:getAssignments', d) },
      assignBoarding:   function (d) { return call('dara:assignBoarding', d) },
      updateAssignment: function (d) { return call('dara:updateAssignment', d) },
    },

    reports: {
      getDashboardStats:   function (d) { return call('reports:getDashboardStats', d) },
      getFinancialReport:  function (d) { return call('reports:getFinancialReport', d) },
      getStudentReport:    function (d) { return call('reports:getStudentReport', d) },
      getAttendanceReport: function (d) { return call('reports:getAttendanceReport', d) },
      getHifzReport:       function (d) { return call('reports:getHifzReport', d) },
      getAuditLogs:        function (d) { return call('reports:getAuditLogs', d) },
      getSuperStats:       function ()  { return call('reports:getSuperStats', {}) },
    },

    settings: {
      getOrgSettings:    function (d) { return call('settings:getOrgSettings', d) },
      updateOrgSettings: function (d) { return call('settings:updateOrgSettings', d) },
      getOrg:            function (d) { return call('settings:getOrg', d) },
      updateOrg:         function (d) { return call('settings:updateOrg', d) },
    },

    // ── Electron-only features → graceful stubs in web mode ─────────────────

    dialog: {
      showSave: function () { return Promise.resolve({ canceled: true }) },
      showOpen: function () { return Promise.resolve({ canceled: true, filePaths: [] }) },
    },

    shell: {
      openPath: function () { return Promise.resolve() },
    },

    fs: {
      // Trigger a browser download instead of writing to disk
      writeBase64: function (d) {
        try {
          var a        = document.createElement('a')
          var filename = (d.path || 'export').split(/[\\/]/).pop()
          a.href       = 'data:application/octet-stream;base64,' + d.data
          a.download   = filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          return Promise.resolve({ success: true })
        } catch (e) {
          return Promise.resolve({ success: false, message: e.message })
        }
      },
    },

    db: {
      backup:  function () { return Promise.resolve({ success: false, message: 'Not supported in web mode' }) },
      restore: function () { return Promise.resolve({ success: false, message: 'Not supported in web mode' }) },
    },

    app: {
      getVersion: function () { return Promise.resolve('1.0.0-web') },
    },
  }

  console.log('[AMK Circle] window.api ready (web/Docker mode)')
})()
