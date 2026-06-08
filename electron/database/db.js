const path = require('path')
const { app } = require('electron')
const applySchema = require('./schema')

let db = null

function getDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH
  const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..', '..')
  return path.join(userDataPath, 'amkcircle.db')
}

async function initDatabase() {
  const Database = require('better-sqlite3')
  const dbPath = getDbPath()
  console.log('[DB] Opening database at:', dbPath)

  db = new Database(dbPath)
  applySchema(db)

  // Seed data if empty
  const orgCount = db.prepare('SELECT COUNT(*) as c FROM organizations').get()
  if (orgCount.c === 0) {
    await seedDatabase(db)
  }

  return db
}

function getDb() {
  if (!db) throw new Error('Database not initialized')
  return db
}

// ─── Query helpers ───────────────────────────────────────────────────────────

function dbGet(sql, ...params) {
  const flat = params.flat()
  return getDb().prepare(sql).get(...flat)
}

function dbAll(sql, ...params) {
  const flat = params.flat()
  return getDb().prepare(sql).all(...flat)
}

function dbRun(sql, ...params) {
  const flat = params.flat()
  return getDb().prepare(sql).run(...flat)
}

function dbTransaction(fn) {
  return getDb().transaction(fn)()
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

function audit(orgId, userId, username, action, tableName, recordId, details) {
  try {
    getDb().prepare(`
      INSERT INTO audit_logs (organization_id, user_id, username, action, table_name, record_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(orgId, userId, username, action, tableName, recordId, details ? JSON.stringify(details) : null)
  } catch (e) {
    console.error('[Audit]', e.message)
  }
}

// ─── Receipt Number ───────────────────────────────────────────────────────────

function nextReceiptNumber(orgId) {
  const settings = dbGet('SELECT receipt_prefix FROM org_settings WHERE organization_id = ?', orgId)
  const prefix = settings?.receipt_prefix || 'RCP'
  const last = dbGet(
    `SELECT receipt_number FROM payments WHERE organization_id = ? ORDER BY id DESC LIMIT 1`,
    orgId
  )
  let nextNum = 1001
  if (last?.receipt_number) {
    const num = parseInt(last.receipt_number.replace(/\D/g, ''))
    if (!isNaN(num)) nextNum = num + 1
  }
  return `${prefix}-${nextNum}`
}

// ─── Seed Database ────────────────────────────────────────────────────────────

async function seedDatabase(database) {
  const bcrypt = require('bcryptjs')
  console.log('[DB] Seeding database with demo data...')

  // ── Reference data: Countries ──
  const countryInsert = database.prepare(`
    INSERT OR IGNORE INTO countries (country_code, country_name, phone_code, timezone, default_currency, date_format)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const COUNTRIES = [
    ['DZ','Algeria','+213','Africa/Algiers','DZD','DD/MM/YYYY'],
    ['AO','Angola','+244','Africa/Luanda','AOA','DD/MM/YYYY'],
    ['BJ','Benin','+229','Africa/Porto-Novo','XOF','DD/MM/YYYY'],
    ['BW','Botswana','+267','Africa/Gaborone','BWP','DD/MM/YYYY'],
    ['BF','Burkina Faso','+226','Africa/Ouagadougou','XOF','DD/MM/YYYY'],
    ['BI','Burundi','+257','Africa/Bujumbura','BIF','DD/MM/YYYY'],
    ['CV','Cabo Verde','+238','Atlantic/Cape_Verde','CVE','DD/MM/YYYY'],
    ['CM','Cameroon','+237','Africa/Douala','XAF','DD/MM/YYYY'],
    ['CF','Central African Republic','+236','Africa/Bangui','XAF','DD/MM/YYYY'],
    ['TD','Chad','+235','Africa/Ndjamena','XAF','DD/MM/YYYY'],
    ['KM','Comoros','+269','Indian/Comoro','KMF','DD/MM/YYYY'],
    ['CG','Republic of Congo','+242','Africa/Brazzaville','XAF','DD/MM/YYYY'],
    ['CD','DR Congo','+243','Africa/Kinshasa','CDF','DD/MM/YYYY'],
    ['CI',"Côte d'Ivoire",'+225','Africa/Abidjan','XOF','DD/MM/YYYY'],
    ['DJ','Djibouti','+253','Africa/Djibouti','DJF','DD/MM/YYYY'],
    ['EG','Egypt','+20','Africa/Cairo','EGP','DD/MM/YYYY'],
    ['GQ','Equatorial Guinea','+240','Africa/Malabo','XAF','DD/MM/YYYY'],
    ['ER','Eritrea','+291','Africa/Asmara','ERN','DD/MM/YYYY'],
    ['SZ','Eswatini','+268','Africa/Mbabane','SZL','DD/MM/YYYY'],
    ['ET','Ethiopia','+251','Africa/Addis_Ababa','ETB','DD/MM/YYYY'],
    ['GA','Gabon','+241','Africa/Libreville','XAF','DD/MM/YYYY'],
    ['GM','Gambia','+220','Africa/Banjul','GMD','DD/MM/YYYY'],
    ['GH','Ghana','+233','Africa/Accra','GHS','DD/MM/YYYY'],
    ['GN','Guinea','+224','Africa/Conakry','GNF','DD/MM/YYYY'],
    ['GW','Guinea-Bissau','+245','Africa/Bissau','XOF','DD/MM/YYYY'],
    ['KE','Kenya','+254','Africa/Nairobi','KES','DD/MM/YYYY'],
    ['LS','Lesotho','+266','Africa/Maseru','LSL','DD/MM/YYYY'],
    ['LR','Liberia','+231','Africa/Monrovia','LRD','DD/MM/YYYY'],
    ['LY','Libya','+218','Africa/Tripoli','LYD','DD/MM/YYYY'],
    ['MG','Madagascar','+261','Indian/Antananarivo','MGA','DD/MM/YYYY'],
    ['MW','Malawi','+265','Africa/Blantyre','MWK','DD/MM/YYYY'],
    ['ML','Mali','+223','Africa/Bamako','XOF','DD/MM/YYYY'],
    ['MR','Mauritania','+222','Africa/Nouakchott','MRU','DD/MM/YYYY'],
    ['MU','Mauritius','+230','Indian/Mauritius','MUR','DD/MM/YYYY'],
    ['MA','Morocco','+212','Africa/Casablanca','MAD','DD/MM/YYYY'],
    ['MZ','Mozambique','+258','Africa/Maputo','MZN','DD/MM/YYYY'],
    ['NA','Namibia','+264','Africa/Windhoek','NAD','DD/MM/YYYY'],
    ['NE','Niger','+227','Africa/Niamey','XOF','DD/MM/YYYY'],
    ['NG','Nigeria','+234','Africa/Lagos','NGN','DD/MM/YYYY'],
    ['RW','Rwanda','+250','Africa/Kigali','RWF','DD/MM/YYYY'],
    ['ST','São Tomé and Príncipe','+239','Africa/Sao_Tome','STN','DD/MM/YYYY'],
    ['SN','Senegal','+221','Africa/Dakar','XOF','DD/MM/YYYY'],
    ['SC','Seychelles','+248','Indian/Mahe','SCR','DD/MM/YYYY'],
    ['SL','Sierra Leone','+232','Africa/Freetown','SLL','DD/MM/YYYY'],
    ['SO','Somalia','+252','Africa/Mogadishu','SOS','DD/MM/YYYY'],
    ['ZA','South Africa','+27','Africa/Johannesburg','ZAR','DD/MM/YYYY'],
    ['SS','South Sudan','+211','Africa/Juba','SSP','DD/MM/YYYY'],
    ['SD','Sudan','+249','Africa/Khartoum','SDG','DD/MM/YYYY'],
    ['TZ','Tanzania','+255','Africa/Dar_es_Salaam','TZS','DD/MM/YYYY'],
    ['TG','Togo','+228','Africa/Lome','XOF','DD/MM/YYYY'],
    ['TN','Tunisia','+216','Africa/Tunis','TND','DD/MM/YYYY'],
    ['UG','Uganda','+256','Africa/Kampala','UGX','DD/MM/YYYY'],
    ['ZM','Zambia','+260','Africa/Lusaka','ZMW','DD/MM/YYYY'],
    ['ZW','Zimbabwe','+263','Africa/Harare','ZWL','DD/MM/YYYY'],
    ['US','United States','+1','America/Chicago','USD','MM/DD/YYYY'],
    ['GB','United Kingdom','+44','Europe/London','GBP','DD/MM/YYYY'],
    ['SA','Saudi Arabia','+966','Asia/Riyadh','SAR','DD/MM/YYYY'],
    ['AE','United Arab Emirates','+971','Asia/Dubai','AED','DD/MM/YYYY'],
    ['MY','Malaysia','+60','Asia/Kuala_Lumpur','MYR','DD/MM/YYYY'],
    ['CA','Canada','+1','America/Toronto','CAD','MM/DD/YYYY'],
    ['AU','Australia','+61','Australia/Sydney','AUD','DD/MM/YYYY'],
    ['PK','Pakistan','+92','Asia/Karachi','PKR','DD/MM/YYYY'],
    ['IN','India','+91','Asia/Kolkata','INR','DD/MM/YYYY'],
    ['TR','Turkey','+90','Europe/Istanbul','TRY','DD/MM/YYYY'],
    ['ID','Indonesia','+62','Asia/Jakarta','IDR','DD/MM/YYYY'],
    ['BD','Bangladesh','+880','Asia/Dhaka','BDT','DD/MM/YYYY'],
    ['QA','Qatar','+974','Asia/Qatar','QAR','DD/MM/YYYY'],
    ['KW','Kuwait','+965','Asia/Kuwait','KWD','DD/MM/YYYY'],
  ]
  for (const c of COUNTRIES) countryInsert.run(...c)

  // ── Reference data: Currencies ──
  const currencyInsert = database.prepare(`
    INSERT OR IGNORE INTO currencies (currency_code, currency_name, currency_symbol)
    VALUES (?, ?, ?)
  `)
  const CURRENCIES = [
    ['USD','US Dollar','$'],
    ['EUR','Euro','€'],
    ['GBP','British Pound','£'],
    ['SAR','Saudi Riyal','﷼'],
    ['AED','UAE Dirham','د.إ'],
    ['QAR','Qatari Riyal','﷼'],
    ['KWD','Kuwaiti Dinar','د.ك'],
    ['MYR','Malaysian Ringgit','RM'],
    ['CAD','Canadian Dollar','CA$'],
    ['AUD','Australian Dollar','A$'],
    ['GMD','Gambian Dalasi','D'],
    ['GHS','Ghanaian Cedi','₵'],
    ['NGN','Nigerian Naira','₦'],
    ['XOF','West African CFA Franc','CFA'],
    ['XAF','Central African CFA Franc','FCFA'],
    ['KES','Kenyan Shilling','KSh'],
    ['UGX','Ugandan Shilling','USh'],
    ['TZS','Tanzanian Shilling','TSh'],
    ['RWF','Rwandan Franc','FRw'],
    ['ETB','Ethiopian Birr','Br'],
    ['EGP','Egyptian Pound','£'],
    ['MAD','Moroccan Dirham','د.م.'],
    ['DZD','Algerian Dinar','دج'],
    ['TND','Tunisian Dinar','د.ت'],
    ['LYD','Libyan Dinar','LD'],
    ['ZAR','South African Rand','R'],
    ['BWP','Botswana Pula','P'],
    ['NAD','Namibian Dollar','N$'],
    ['ZMW','Zambian Kwacha','ZK'],
    ['MWK','Malawian Kwacha','MK'],
    ['MZN','Mozambican Metical','MT'],
    ['SLL','Sierra Leonean Leone','Le'],
    ['LRD','Liberian Dollar','L$'],
    ['AOA','Angolan Kwanza','Kz'],
    ['BIF','Burundian Franc','Fr'],
    ['CVE','Cape Verdean Escudo','$'],
    ['KMF','Comorian Franc','Fr'],
    ['CDF','Congolese Franc','Fr'],
    ['DJF','Djiboutian Franc','Fr'],
    ['ERN','Eritrean Nakfa','Nfk'],
    ['SZL','Swazi Lilangeni','L'],
    ['GNF','Guinean Franc','Fr'],
    ['LSL','Lesotho Loti','L'],
    ['MGA','Malagasy Ariary','Ar'],
    ['MRU','Mauritanian Ouguiya','UM'],
    ['MUR','Mauritian Rupee','₨'],
    ['SCR','Seychellois Rupee','₨'],
    ['SOS','Somali Shilling','Sh'],
    ['SSP','South Sudanese Pound','£'],
    ['SDG','Sudanese Pound','£'],
    ['STN','São Tomé Dobra','Db'],
    ['ZWL','Zimbabwean Dollar','Z$'],
    ['PKR','Pakistani Rupee','₨'],
    ['INR','Indian Rupee','₹'],
    ['TRY','Turkish Lira','₺'],
    ['IDR','Indonesian Rupiah','Rp'],
    ['BDT','Bangladeshi Taka','৳'],
  ]
  for (const c of CURRENCIES) currencyInsert.run(...c)

  // ── Super Admin (no org) ──
  const superHash = bcrypt.hashSync('Admin@123!', 10)
  database.prepare(`
    INSERT OR IGNORE INTO users (organization_id, username, email, password_hash, full_name, role)
    VALUES (NULL, 'superadmin', 'admin@amkcircle.com', ?, 'Platform Administrator', 'super_admin')
  `).run(superHash)

  // ── Demo Organization: IECC ──
  database.prepare(`
    INSERT OR IGNORE INTO organizations (name, slug, org_type, address, city, state, country, email, phone, website, primary_color, secondary_color)
    VALUES (
      'IECC – Islamic Educational & Community Center',
      'iecc',
      'Islamic Community Center',
      '1234 Elm Street NE',
      'Minneapolis',
      'Minnesota',
      'USA',
      'info@iecc-mn.org',
      '+1 (612) 555-0100',
      'https://iecc-mn.org',
      '#15803d',
      '#d97706'
    )
  `).run()

  const iecc = database.prepare(`SELECT id FROM organizations WHERE slug = 'iecc'`).get()
  const orgId = iecc.id

  // ── IECC Admin ──
  const adminHash = bcrypt.hashSync('Admin@123!', 10)
  database.prepare(`
    INSERT OR IGNORE INTO users (organization_id, username, email, password_hash, full_name, role)
    VALUES (?, 'iecc_admin', 'admin@iecc-mn.org', ?, 'IECC Administrator', 'organization_admin')
  `).run(orgId, adminHash)

  // ── IECC Teacher ──
  const teacherHash = bcrypt.hashSync('Teacher@123!', 10)
  database.prepare(`
    INSERT OR IGNORE INTO users (organization_id, username, email, password_hash, full_name, role)
    VALUES (?, 'teacher1', 'teacher@iecc-mn.org', ?, 'Ahmed Al-Farsi', 'teacher')
  `).run(orgId, teacherHash)

  // ── Finance User ──
  const financeHash = bcrypt.hashSync('Finance@123!', 10)
  database.prepare(`
    INSERT OR IGNORE INTO users (organization_id, username, email, password_hash, full_name, role)
    VALUES (?, 'finance1', 'finance@iecc-mn.org', ?, 'Sarah Johnson', 'finance')
  `).run(orgId, financeHash)

  // ── Org Settings ──
  database.prepare(`
    INSERT OR IGNORE INTO org_settings (organization_id, academic_year, currency, currency_symbol, receipt_prefix)
    VALUES (?, '2024-2025', 'USD', '$', 'IECC')
  `).run(orgId)

  // ── Prayer Times ──
  database.prepare(`
    INSERT OR IGNORE INTO prayer_times (organization_id, schedule_name, fajr, fajr_iqamah, sunrise, dhuhr, dhuhr_iqamah, asr, asr_iqamah, maghrib, maghrib_iqamah, isha, isha_iqamah, jumu_ah, jumu_ah_iqamah, effective_date)
    VALUES (?, 'Default', '05:45', '06:00', '07:12', '13:00', '13:15', '16:30', '16:45', '20:15', '20:20', '21:45', '22:00', '13:30', '13:30', '2024-01-01')
  `).run(orgId)

  // ── Teachers ──
  const teachers = [
    ['EMP-001', 'Sheikh Ahmad Hassan', 'شيخ أحمد حسن', 'ahmad.hassan@iecc-mn.org', '612-555-0101', 'male', 'Quran & Islamic Studies', '2019-09-01', 4500],
    ['EMP-002', 'Ustadh Ibrahim Khalil', 'أستاذ إبراهيم خليل', 'ibrahim@iecc-mn.org', '612-555-0102', 'male', 'Arabic Language', '2020-01-15', 4000],
    ['EMP-003', 'Sister Fatima Noor', 'الأخت فاطمة نور', 'fatima.noor@iecc-mn.org', '612-555-0103', 'female', 'Elementary Education', '2021-08-20', 3800],
    ['EMP-004', 'Ustadha Amina Rashid', null, 'amina.rashid@iecc-mn.org', '612-555-0104', 'female', 'Hifz Program', '2020-06-01', 4200],
  ]
  const teacherInsert = database.prepare(`
    INSERT OR IGNORE INTO teachers (organization_id, employee_id, full_name, arabic_name, email, phone, gender, specialization, hire_date, salary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const t of teachers) teacherInsert.run(orgId, ...t)

  const teacher1 = database.prepare(`SELECT id FROM teachers WHERE organization_id=? AND employee_id='EMP-001'`).get(orgId)
  const teacher2 = database.prepare(`SELECT id FROM teachers WHERE organization_id=? AND employee_id='EMP-002'`).get(orgId)
  const teacher3 = database.prepare(`SELECT id FROM teachers WHERE organization_id=? AND employee_id='EMP-003'`).get(orgId)
  const teacher4 = database.prepare(`SELECT id FROM teachers WHERE organization_id=? AND employee_id='EMP-004'`).get(orgId)

  // ── Classes ──
  const classes = [
    ['Hifz Class A', 'Advanced', teacher4?.id, 'Room 101', 20, '2024-2025'],
    ['Islamic Studies - Level 1', 'Beginner', teacher1?.id, 'Room 102', 25, '2024-2025'],
    ['Arabic Language - Intermediate', 'Intermediate', teacher2?.id, 'Room 103', 20, '2024-2025'],
    ['Elementary Quran', 'Elementary', teacher3?.id, 'Room 104', 30, '2024-2025'],
  ]
  const classInsert = database.prepare(`
    INSERT OR IGNORE INTO classes (organization_id, name, grade_level, teacher_id, room, capacity, academic_year)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  for (const c of classes) classInsert.run(orgId, ...c)

  const class1 = database.prepare(`SELECT id FROM classes WHERE organization_id=? ORDER BY id LIMIT 1`).get(orgId)
  const classList = database.prepare(`SELECT id FROM classes WHERE organization_id=?`).all(orgId)

  // ── Students ──
  const students = [
    ['STU-001', 'Yusuf Al-Rashid', 'يوسف الرشيد', '2012-03-15', 'male', 'American', classList[0]?.id, 'Abdullah Al-Rashid', '612-555-1001', 'parent1@email.com', '2023-09-01', 'active'],
    ['STU-002', 'Maryam Ibrahim', 'مريم إبراهيم', '2011-07-22', 'female', 'Somali', classList[1]?.id, 'Khalid Ibrahim', '612-555-1002', 'parent2@email.com', '2023-09-01', 'active'],
    ['STU-003', 'Omar Suleiman', 'عمر سليمان', '2013-11-05', 'male', 'Egyptian', classList[2]?.id, 'Hassan Suleiman', '612-555-1003', 'parent3@email.com', '2023-09-01', 'active'],
    ['STU-004', 'Aisha Diallo', null, '2012-05-18', 'female', 'West African', classList[3]?.id, 'Mamadou Diallo', '612-555-1004', 'parent4@email.com', '2023-09-01', 'active'],
    ['STU-005', 'Ibrahim Hassan', 'إبراهيم حسن', '2010-09-30', 'male', 'Sudanese', classList[0]?.id, 'Ahmed Hassan', '612-555-1005', 'parent5@email.com', '2022-09-01', 'active'],
    ['STU-006', 'Zainab Mohammed', 'زينب محمد', '2011-02-14', 'female', 'Pakistani', classList[1]?.id, 'Tariq Mohammed', '612-555-1006', 'parent6@email.com', '2023-01-15', 'active'],
    ['STU-007', 'Adam Kofi', null, '2013-06-08', 'male', 'Ghanaian', classList[3]?.id, 'Kwame Kofi', '612-555-1007', 'parent7@email.com', '2023-09-01', 'active'],
    ['STU-008', 'Noor Al-Din', 'نور الدين', '2012-12-01', 'male', 'Syrian', classList[2]?.id, 'Tariq Al-Din', '612-555-1008', 'parent8@email.com', '2023-09-01', 'active'],
  ]
  const studentInsert = database.prepare(`
    INSERT OR IGNORE INTO students (organization_id, student_id, full_name, arabic_name, date_of_birth, gender, nationality, class_id, parent_name, parent_phone, parent_email, enrolled_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const s of students) studentInsert.run(orgId, ...s)

  const allStudents = database.prepare(`SELECT id FROM students WHERE organization_id=?`).all(orgId)

  // ── Attendance (last 7 days) ──
  const attInsert = database.prepare(`
    INSERT OR IGNORE INTO attendance (organization_id, student_id, class_id, date, status)
    VALUES (?, ?, ?, ?, ?)
  `)
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    // skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue
    for (const s of allStudents) {
      const rand = Math.random()
      const status = rand > 0.85 ? 'absent' : rand > 0.75 ? 'late' : 'present'
      attInsert.run(orgId, s.id, classList[0]?.id, dateStr, status)
    }
  }

  // ── Quran Progress (for first student) ──
  if (allStudents.length > 0) {
    const qInsert = database.prepare(`
      INSERT OR IGNORE INTO quran_progress (organization_id, student_id, date, surah_name, surah_number, ayah_from, ayah_to, juz_number, pages, type, grade, teacher_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const quranData = [
      [allStudents[0].id, '2024-01-10', 'Al-Baqarah', 2, 1, 20, 1, '1-4', 'memorization', 'Excellent', teacher4?.id],
      [allStudents[0].id, '2024-01-17', 'Al-Baqarah', 2, 21, 50, 1, '5-9', 'memorization', 'Very Good', teacher4?.id],
      [allStudents[0].id, '2024-02-01', 'Al-Baqarah', 2, 51, 100, 2, '10-16', 'revision', 'Good', teacher4?.id],
      [allStudents[1].id, '2024-01-12', 'Al-Fatiha', 1, 1, 7, 1, '1', 'memorization', 'Excellent', teacher1?.id],
    ]
    for (const q of quranData) qInsert.run(orgId, ...q)
  }

  // ── Payments ──
  const pmtInsert = database.prepare(`
    INSERT OR IGNORE INTO payments (organization_id, receipt_number, person_name, person_phone, student_id, amount, payment_type, payment_method, status, description, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const paymentData = [
    ['IECC-1001', 'Abdullah Al-Rashid', '612-555-1001', allStudents[0]?.id, 250.00, 'tuition', 'cash', 'paid', 'Monthly tuition - January 2024', '2024-01-05'],
    ['IECC-1002', 'Khalid Ibrahim', '612-555-1002', allStudents[1]?.id, 250.00, 'tuition', 'check', 'paid', 'Monthly tuition - January 2024', '2024-01-08'],
    ['IECC-1003', 'Community Member', '612-555-2001', null, 500.00, 'donation', 'cash', 'paid', 'General donation', '2024-01-10'],
    ['IECC-1004', 'Hassan Suleiman', '612-555-1003', allStudents[2]?.id, 250.00, 'tuition', 'cash', 'paid', 'Monthly tuition - January 2024', '2024-01-12'],
    ['IECC-1005', 'Anonymous', null, null, 1000.00, 'zakat', 'cash', 'paid', 'Zakat Al-Mal', '2024-01-15'],
    ['IECC-1006', 'Abdullah Al-Rashid', '612-555-1001', allStudents[0]?.id, 250.00, 'tuition', 'card', 'paid', 'Monthly tuition - February 2024', '2024-02-05'],
    ['IECC-1007', 'Community Member 2', '612-555-2002', null, 750.00, 'donation', 'check', 'paid', 'Ramadan donation', '2024-02-10'],
    ['IECC-1008', 'Tariq Mohammed', '612-555-1006', allStudents[5]?.id, 250.00, 'tuition', 'cash', 'paid', 'Monthly tuition - February 2024', '2024-02-15'],
    ['IECC-1009', 'Community Member 3', '612-555-2003', null, 300.00, 'sadaqah', 'cash', 'paid', 'Sadaqah', '2024-03-01'],
    ['IECC-1010', 'Ahmed Hassan', '612-555-1005', allStudents[4]?.id, 250.00, 'tuition', 'cash', 'paid', 'Monthly tuition - March 2024', '2024-03-05'],
  ]
  for (const p of paymentData) pmtInsert.run(orgId, ...p)

  // ── Events ──
  const evtInsert = database.prepare(`
    INSERT OR IGNORE INTO events (organization_id, title, description, date, time, location, category, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  evtInsert.run(orgId, "Eid Al-Fitr Celebration", "Annual Eid celebration for the community", "2024-04-10", "09:00", "IECC Main Hall", "eid", "upcoming")
  evtInsert.run(orgId, "Quran Competition", "Annual Hifz and Tilawah competition for students", "2024-03-25", "10:00", "IECC Auditorium", "academic", "upcoming")
  evtInsert.run(orgId, "Fundraiser Dinner", "Annual fundraiser dinner to support our programs", "2024-04-20", "18:30", "Minneapolis Convention Center", "fundraiser", "upcoming")
  evtInsert.run(orgId, "Islamic Studies Seminar", "Weekend seminar on contemporary Islamic issues", "2024-02-03", "13:00", "IECC Hall", "lecture", "completed")

  // ── Announcements ──
  const annInsert = database.prepare(`
    INSERT OR IGNORE INTO announcements (organization_id, title, content, type, published, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  annInsert.run(orgId, "Ramadan Schedule Update", "Please note that class times have been adjusted for Ramadan. Evening classes will now start at 9:30 PM after Tarawih prayers.", "ramadan", 1, "2024-03-01")
  annInsert.run(orgId, "New Teacher Joining", "We are pleased to welcome Ustadh Bilal Ahmad to our teaching staff. He will be leading the advanced Arabic classes.", "general", 1, "2024-01-20")
  annInsert.run(orgId, "Registration Open", "Registration for the Spring 2024 semester is now open. Please visit the office or register online.", "general", 1, "2024-01-15")
  annInsert.run(orgId, "Jumu'ah Time Change", "Please note that Jumu'ah prayer time has been updated to 1:30 PM starting from next week.", "jumu_ah", 1, "2024-02-10")

  // ── Khutbah ──
  const kInsert = database.prepare(`
    INSERT OR IGNORE INTO khutbah (organization_id, title, speaker, date, language, topic)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  kInsert.run(orgId, "Patience in Difficult Times", "Sheikh Ahmad Hassan", "2024-01-12", "English", "Sabr (Patience)")
  kInsert.run(orgId, "The Importance of Knowledge", "Sheikh Ahmad Hassan", "2024-01-19", "English", "Ilm (Knowledge)")
  kInsert.run(orgId, "Family in Islam", "Guest Speaker", "2024-01-26", "English & Arabic", "Family Values")
  kInsert.run(orgId, "Preparing for Ramadan", "Sheikh Ahmad Hassan", "2024-03-01", "English", "Ramadan Preparation")

  // ── Expenses ──
  const expInsert = database.prepare(`
    INSERT OR IGNORE INTO expenses (organization_id, category, description, amount, date, vendor, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  expInsert.run(orgId, "utilities", "Electricity bill - January", 380.00, "2024-01-20", "Xcel Energy", "approved")
  expInsert.run(orgId, "supplies", "Classroom supplies and whiteboards", 245.50, "2024-01-22", "Office Depot", "approved")
  expInsert.run(orgId, "maintenance", "HVAC maintenance and repair", 520.00, "2024-01-25", "ABC HVAC Services", "approved")
  expInsert.run(orgId, "utilities", "Internet and phone - January", 189.00, "2024-01-28", "Comcast", "approved")
  expInsert.run(orgId, "supplies", "Quran books and Islamic materials", 312.00, "2024-02-05", "Islamic Bookstore", "approved")

  // ── Salaries ──
  const salInsert = database.prepare(`
    INSERT OR IGNORE INTO salaries (organization_id, teacher_id, month, base_amount, allowances, deductions, net_amount, payment_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  if (teacher1) salInsert.run(orgId, teacher1.id, '2024-01', 4500, 200, 350, 4350, '2024-01-31', 'paid')
  if (teacher2) salInsert.run(orgId, teacher2.id, '2024-01', 4000, 150, 300, 3850, '2024-01-31', 'paid')
  if (teacher3) salInsert.run(orgId, teacher3.id, '2024-01', 3800, 150, 280, 3670, '2024-01-31', 'paid')
  if (teacher4) salInsert.run(orgId, teacher4.id, '2024-01', 4200, 200, 320, 4080, '2024-01-31', 'paid')

  // ── Hifz Milestones ──
  if (allStudents.length > 0) {
    const mInsert = database.prepare(`
      INSERT OR IGNORE INTO hifz_milestones (organization_id, student_id, milestone_type, juz_number, pages_completed, total_pages, completed_date, grade, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    mInsert.run(orgId, allStudents[0].id, 'juz_complete', 1, 20, 604, '2024-01-15', 'Excellent', 'Completed Juz Amma with excellent tajweed')
    mInsert.run(orgId, allStudents[0].id, 'juz_complete', 2, 40, 604, '2024-02-20', 'Very Good', 'Completed Juz 2 with good retention')
    mInsert.run(orgId, allStudents[4].id, 'juz_complete', 1, 20, 604, '2024-01-20', 'Good', 'First juz completed')
  }

  console.log('[DB] Seed data inserted successfully')
}

module.exports = { initDatabase, getDb, dbGet, dbAll, dbRun, dbTransaction, audit, nextReceiptNumber, getDbPath }
