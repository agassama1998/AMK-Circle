const { dbAll, dbGet } = require('../database/db')

module.exports = {
  'countries:getAll': async () => {
    try {
      const data = dbAll('SELECT * FROM countries ORDER BY country_name')
      return { success: true, data }
    } catch (e) { return { success: false, message: e.message } }
  },

  'countries:getByCode': async (_, { code } = {}) => {
    try {
      const data = dbGet('SELECT * FROM countries WHERE country_code = ?', code)
      return { success: true, data: data || null }
    } catch (e) { return { success: false, message: e.message } }
  },

  'currencies:getAll': async () => {
    try {
      const data = dbAll('SELECT * FROM currencies ORDER BY currency_code')
      return { success: true, data }
    } catch (e) { return { success: false, message: e.message } }
  },

  'currencies:getByCode': async (_, { code } = {}) => {
    try {
      const data = dbGet('SELECT * FROM currencies WHERE currency_code = ?', code)
      return { success: true, data: data || null }
    } catch (e) { return { success: false, message: e.message } }
  },
}
