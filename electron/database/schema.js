// AMK Circle - Complete Database Schema
// Multi-tenant SQLite schema — every major table includes organization_id

module.exports = function applySchema(db) {
  db.exec(`PRAGMA journal_mode = WAL;`)
  db.exec(`PRAGMA foreign_keys = ON;`)

  // ─────────────────────────────────────────
  // ORGANIZATIONS (Multi-Tenant Core)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT    NOT NULL,
      slug                TEXT    UNIQUE NOT NULL,
      org_type            TEXT    NOT NULL DEFAULT 'Islamic Community Center',
      logo                TEXT,
      address             TEXT,
      city                TEXT,
      state               TEXT,
      country             TEXT    DEFAULT 'USA',
      email               TEXT,
      phone               TEXT,
      website             TEXT,
      timezone            TEXT    DEFAULT 'America/Chicago',
      subscription_status TEXT    DEFAULT 'active',
      primary_color       TEXT    DEFAULT '#15803d',
      secondary_color     TEXT    DEFAULT '#d97706',
      settings_json       TEXT    DEFAULT '{}',
      is_active           INTEGER DEFAULT 1,
      created_at          TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at          TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER REFERENCES organizations(id),
      username        TEXT    NOT NULL,
      email           TEXT    NOT NULL,
      password_hash   TEXT    NOT NULL,
      full_name       TEXT    NOT NULL,
      role            TEXT    NOT NULL DEFAULT 'teacher',
      avatar          TEXT,
      phone           TEXT,
      is_active       INTEGER DEFAULT 1,
      last_login      TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, username),
      UNIQUE(organization_id, email)
    );
  `)

  // ─────────────────────────────────────────
  // PARENTS / GUARDIANS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS parents (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      full_name       TEXT    NOT NULL,
      email           TEXT,
      phone           TEXT,
      alt_phone       TEXT,
      address         TEXT,
      occupation      TEXT,
      relationship    TEXT    DEFAULT 'father',
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // TEACHERS / STAFF
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      employee_id     TEXT    NOT NULL,
      full_name       TEXT    NOT NULL,
      arabic_name     TEXT,
      email           TEXT,
      phone           TEXT,
      gender          TEXT    DEFAULT 'male',
      specialization  TEXT,
      hire_date       TEXT,
      salary          REAL    DEFAULT 0,
      status          TEXT    DEFAULT 'active',
      photo           TEXT,
      qualifications  TEXT,
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, employee_id)
    );
  `)

  // ─────────────────────────────────────────
  // CLASSES / SECTIONS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      name            TEXT    NOT NULL,
      grade_level     TEXT,
      teacher_id      INTEGER REFERENCES teachers(id),
      room            TEXT,
      capacity        INTEGER DEFAULT 30,
      schedule        TEXT,
      academic_year   TEXT,
      department      TEXT,
      status          TEXT    DEFAULT 'active',
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // STUDENTS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      student_id      TEXT    NOT NULL,
      full_name       TEXT    NOT NULL,
      arabic_name     TEXT,
      date_of_birth   TEXT,
      gender          TEXT    DEFAULT 'male',
      nationality     TEXT,
      class_id        INTEGER REFERENCES classes(id),
      parent_id       INTEGER REFERENCES parents(id),
      parent_name     TEXT,
      parent_phone    TEXT,
      parent_email    TEXT,
      address         TEXT,
      enrolled_date   TEXT,
      graduation_date TEXT,
      status          TEXT    DEFAULT 'active',
      photo           TEXT,
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      updated_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, student_id)
    );
  `)

  // ─────────────────────────────────────────
  // SUBJECTS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      name            TEXT    NOT NULL,
      code            TEXT,
      description     TEXT,
      class_id        INTEGER REFERENCES classes(id),
      teacher_id      INTEGER REFERENCES teachers(id),
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // ATTENDANCE
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      student_id      INTEGER NOT NULL REFERENCES students(id),
      class_id        INTEGER REFERENCES classes(id),
      date            TEXT    NOT NULL,
      status          TEXT    NOT NULL DEFAULT 'present',
      notes           TEXT,
      recorded_by     INTEGER REFERENCES users(id),
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, student_id, date)
    );
  `)

  // ─────────────────────────────────────────
  // EXAMS & GRADES
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      name            TEXT    NOT NULL,
      class_id        INTEGER REFERENCES classes(id),
      subject_id      INTEGER REFERENCES subjects(id),
      exam_date       TEXT,
      total_marks     REAL    DEFAULT 100,
      passing_marks   REAL    DEFAULT 50,
      exam_type       TEXT    DEFAULT 'written',
      status          TEXT    DEFAULT 'scheduled',
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS grades (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      exam_id         INTEGER NOT NULL REFERENCES exams(id),
      student_id      INTEGER NOT NULL REFERENCES students(id),
      marks_obtained  REAL,
      grade_letter    TEXT,
      remarks         TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(exam_id, student_id)
    );
  `)

  // ─────────────────────────────────────────
  // QURAN PROGRESS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS quran_progress (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      student_id      INTEGER NOT NULL REFERENCES students(id),
      date            TEXT    NOT NULL,
      surah_name      TEXT,
      surah_number    INTEGER,
      ayah_from       INTEGER,
      ayah_to         INTEGER,
      juz_number      INTEGER,
      pages           TEXT,
      type            TEXT    DEFAULT 'memorization',
      grade           TEXT,
      teacher_id      INTEGER REFERENCES teachers(id),
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // HIFZ MILESTONES (Dara/Boarding school)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS hifz_milestones (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      student_id      INTEGER NOT NULL REFERENCES students(id),
      milestone_type  TEXT    NOT NULL,
      juz_number      INTEGER,
      surah_name      TEXT,
      pages_completed INTEGER,
      total_pages     INTEGER DEFAULT 604,
      completed_date  TEXT,
      verified_by     INTEGER REFERENCES teachers(id),
      grade           TEXT,
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // DORMITORIES & BOARDING (Dara)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS dormitories (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      name            TEXT    NOT NULL,
      capacity        INTEGER DEFAULT 10,
      supervisor_id   INTEGER REFERENCES teachers(id),
      gender          TEXT    DEFAULT 'male',
      floor           TEXT,
      status          TEXT    DEFAULT 'active',
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS boarding_assignments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      student_id      INTEGER NOT NULL REFERENCES students(id),
      dormitory_id    INTEGER REFERENCES dormitories(id),
      room_number     TEXT,
      bed_number      TEXT,
      check_in_date   TEXT,
      check_out_date  TEXT,
      boarding_fee    REAL    DEFAULT 0,
      meal_plan       TEXT    DEFAULT 'full',
      status          TEXT    DEFAULT 'active',
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // PRAYER TIMES (Masjid)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS prayer_times (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id  INTEGER NOT NULL REFERENCES organizations(id),
      schedule_name    TEXT    DEFAULT 'Default',
      fajr             TEXT,
      fajr_iqamah      TEXT,
      sunrise          TEXT,
      dhuhr            TEXT,
      dhuhr_iqamah     TEXT,
      asr              TEXT,
      asr_iqamah       TEXT,
      maghrib          TEXT,
      maghrib_iqamah   TEXT,
      isha             TEXT,
      isha_iqamah      TEXT,
      jumu_ah          TEXT,
      jumu_ah_iqamah   TEXT,
      second_jumu_ah   TEXT,
      effective_date   TEXT,
      is_ramadan       INTEGER DEFAULT 0,
      updated_at       TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, schedule_name)
    );
  `)

  // ─────────────────────────────────────────
  // EVENTS (Masjid / Community)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      title           TEXT    NOT NULL,
      description     TEXT,
      date            TEXT    NOT NULL,
      time            TEXT,
      end_date        TEXT,
      end_time        TEXT,
      location        TEXT,
      category        TEXT    DEFAULT 'general',
      status          TEXT    DEFAULT 'upcoming',
      is_public       INTEGER DEFAULT 1,
      created_by      INTEGER REFERENCES users(id),
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // ANNOUNCEMENTS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      title           TEXT    NOT NULL,
      content         TEXT    NOT NULL,
      type            TEXT    DEFAULT 'general',
      audience        TEXT    DEFAULT 'all',
      published       INTEGER DEFAULT 1,
      date            TEXT,
      expires_at      TEXT,
      created_by      INTEGER REFERENCES users(id),
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // KHUTBAH (Friday Sermon)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS khutbah (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      title           TEXT    NOT NULL,
      speaker         TEXT,
      date            TEXT    NOT NULL,
      language        TEXT    DEFAULT 'English',
      topic           TEXT,
      description     TEXT,
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // VOLUNTEERS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS volunteers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      full_name       TEXT    NOT NULL,
      email           TEXT,
      phone           TEXT,
      skills          TEXT,
      availability    TEXT,
      status          TEXT    DEFAULT 'active',
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // PAYMENTS / FINANCE
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      receipt_number  TEXT    NOT NULL,
      person_name     TEXT    NOT NULL,
      person_email    TEXT,
      person_phone    TEXT,
      person_address  TEXT,
      student_id      INTEGER REFERENCES students(id),
      amount          REAL    NOT NULL,
      payment_type    TEXT    NOT NULL,
      payment_method  TEXT    DEFAULT 'cash',
      status          TEXT    DEFAULT 'paid',
      description     TEXT,
      notes           TEXT,
      date            TEXT    NOT NULL,
      processed_by    INTEGER REFERENCES users(id),
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, receipt_number)
    );
  `)

  // ─────────────────────────────────────────
  // EXPENSES
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      category        TEXT    NOT NULL,
      description     TEXT    NOT NULL,
      amount          REAL    NOT NULL,
      date            TEXT    NOT NULL,
      vendor          TEXT,
      receipt_ref     TEXT,
      approved_by     INTEGER REFERENCES users(id),
      status          TEXT    DEFAULT 'approved',
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // SALARIES
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS salaries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      teacher_id      INTEGER NOT NULL REFERENCES teachers(id),
      month           TEXT    NOT NULL,
      base_amount     REAL    NOT NULL,
      allowances      REAL    DEFAULT 0,
      deductions      REAL    DEFAULT 0,
      net_amount      REAL    NOT NULL,
      payment_date    TEXT,
      status          TEXT    DEFAULT 'paid',
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, teacher_id, month)
    );
  `)

  // ─────────────────────────────────────────
  // COUNTRIES (reference table — not org-scoped)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS countries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code    TEXT    NOT NULL UNIQUE,
      country_name    TEXT    NOT NULL,
      phone_code      TEXT,
      timezone        TEXT,
      default_currency TEXT,
      date_format     TEXT    DEFAULT 'DD/MM/YYYY'
    );
  `)

  // ─────────────────────────────────────────
  // CURRENCIES (reference table — not org-scoped)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS currencies (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      currency_code   TEXT    NOT NULL UNIQUE,
      currency_name   TEXT    NOT NULL,
      currency_symbol TEXT    NOT NULL
    );
  `)

  // ─────────────────────────────────────────
  // TIMETABLE SLOTS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS timetable_slots (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      class_id        INTEGER REFERENCES classes(id),
      subject_id      INTEGER REFERENCES subjects(id),
      teacher_id      INTEGER REFERENCES teachers(id),
      day_of_week     TEXT    NOT NULL,
      start_time      TEXT    NOT NULL,
      end_time        TEXT    NOT NULL,
      room            TEXT,
      academic_year   TEXT,
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_timetable_org   ON timetable_slots(organization_id);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable_slots(class_id);`)

  // ─────────────────────────────────────────
  // DISCIPLINE RECORDS (Dara / School)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS discipline_records (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      student_id      INTEGER NOT NULL REFERENCES students(id),
      incident_date   TEXT    NOT NULL,
      incident_type   TEXT    NOT NULL DEFAULT 'misconduct',
      severity        TEXT    NOT NULL DEFAULT 'minor',
      description     TEXT    NOT NULL,
      action_taken    TEXT,
      reported_by     INTEGER REFERENCES users(id),
      resolved        INTEGER DEFAULT 0,
      resolved_date   TEXT,
      parent_notified INTEGER DEFAULT 0,
      notes           TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_discipline_org     ON discipline_records(organization_id);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_discipline_student ON discipline_records(student_id);`)

  // ─────────────────────────────────────────
  // FEEDING RECORDS (Dara Boarding)
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeding_records (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL REFERENCES organizations(id),
      dormitory_id    INTEGER REFERENCES dormitories(id),
      date            TEXT    NOT NULL,
      meal_type       TEXT    NOT NULL DEFAULT 'breakfast',
      student_count   INTEGER DEFAULT 0,
      menu            TEXT,
      cost            REAL    DEFAULT 0,
      notes           TEXT,
      recorded_by     INTEGER REFERENCES users(id),
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, dormitory_id, date, meal_type)
    );
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_feeding_org  ON feeding_records(organization_id);`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_feeding_date ON feeding_records(date);`)

  // ─────────────────────────────────────────
  // ORGANIZATION SETTINGS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS org_settings (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id       INTEGER NOT NULL REFERENCES organizations(id) UNIQUE,
      academic_year         TEXT,
      currency              TEXT    DEFAULT 'USD',
      currency_symbol       TEXT    DEFAULT '$',
      date_format           TEXT    DEFAULT 'MM/DD/YYYY',
      language              TEXT    DEFAULT 'en',
      email_notifications   INTEGER DEFAULT 0,
      auto_receipt          INTEGER DEFAULT 1,
      receipt_prefix        TEXT    DEFAULT 'RCP',
      settings_json         TEXT    DEFAULT '{}',
      updated_at            TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // AUDIT LOGS
  // ─────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER,
      user_id         INTEGER REFERENCES users(id),
      username        TEXT,
      action          TEXT    NOT NULL,
      table_name      TEXT,
      record_id       INTEGER,
      details         TEXT,
      created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // ─────────────────────────────────────────
  // INDEXES for performance
  // ─────────────────────────────────────────
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_students_org      ON students(organization_id);
    CREATE INDEX IF NOT EXISTS idx_students_class    ON students(class_id);
    CREATE INDEX IF NOT EXISTS idx_students_status   ON students(status);
    CREATE INDEX IF NOT EXISTS idx_teachers_org      ON teachers(organization_id);
    CREATE INDEX IF NOT EXISTS idx_classes_org       ON classes(organization_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_org    ON attendance(organization_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_date   ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    CREATE INDEX IF NOT EXISTS idx_payments_org      ON payments(organization_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date     ON payments(date);
    CREATE INDEX IF NOT EXISTS idx_payments_type     ON payments(payment_type);
    CREATE INDEX IF NOT EXISTS idx_events_org        ON events(organization_id);
    CREATE INDEX IF NOT EXISTS idx_announcements_org ON announcements(organization_id);
    CREATE INDEX IF NOT EXISTS idx_quran_student     ON quran_progress(student_id);
    CREATE INDEX IF NOT EXISTS idx_audit_org         ON audit_logs(organization_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created     ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_org          ON users(organization_id);
    CREATE INDEX IF NOT EXISTS idx_teachers_status    ON teachers(status);
    CREATE INDEX IF NOT EXISTS idx_students_status2   ON students(status);
    CREATE INDEX IF NOT EXISTS idx_hifz_student       ON hifz_milestones(student_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_org       ON expenses(organization_id);
    CREATE INDEX IF NOT EXISTS idx_salaries_org       ON salaries(organization_id);
  `)

  // ─────────────────────────────────────────
  // RUNTIME MIGRATIONS
  // Safely adds columns introduced after the initial schema.
  // SQLite ALTER TABLE only supports ADD COLUMN; wrapping in try/catch
  // means duplicate runs on an already-migrated database are a no-op.
  // ─────────────────────────────────────────
  const runtimeMigrations = [
    // 2026-05 — User lifecycle: text status column + soft-delete columns
    `ALTER TABLE users ADD COLUMN status     TEXT DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN deleted_at TEXT`,
    `ALTER TABLE users ADD COLUMN deleted_by INTEGER`,
    // 2026-05 — Parent/Student user account linkage
    // Allows explicit FK from a parent/student user account to their record.
    // Falls back to email/username matching if user_id is NULL.
    `ALTER TABLE students ADD COLUMN user_id INTEGER REFERENCES users(id)`,
    `ALTER TABLE parents  ADD COLUMN user_id INTEGER REFERENCES users(id)`,
    // 2026-05 — Organization soft-delete (super_admin only)
    `ALTER TABLE organizations ADD COLUMN is_deleted  INTEGER DEFAULT 0`,
    `ALTER TABLE organizations ADD COLUMN deleted_at  TEXT`,
    `ALTER TABLE organizations ADD COLUMN deleted_by  INTEGER REFERENCES users(id)`,
  ]
  for (const sql of runtimeMigrations) {
    try { db.exec(sql) } catch (_) { /* column already exists — skip */ }
  }

  // Create the status index only after the column migration is guaranteed to exist.
  // (Placing it in the main index block above would fail on first-run databases
  //  because the column doesn't exist yet at that point.)
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`)
  } catch (_) { /* ignore */ }

  // Back-fill status from is_active for rows that pre-date this column.
  db.exec(`
    UPDATE users
    SET    status = CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END
    WHERE  status IS NULL OR status = ''
  `)

  // Seed reference tables on every startup (INSERT OR IGNORE is a no-op if already present)
  const _seedRef = () => {
    const ci = db.prepare(`INSERT OR IGNORE INTO countries (country_code, country_name, phone_code, timezone, default_currency, date_format) VALUES (?, ?, ?, ?, ?, ?)`)
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
    ]
    for (const c of COUNTRIES) ci.run(...c)

    const curi = db.prepare(`INSERT OR IGNORE INTO currencies (currency_code, currency_name, currency_symbol) VALUES (?, ?, ?)`)
    const CURRENCIES = [
      ['USD','US Dollar','$'],['EUR','Euro','€'],['GBP','British Pound','£'],
      ['SAR','Saudi Riyal','﷼'],['AED','UAE Dirham','د.إ'],['MYR','Malaysian Ringgit','RM'],
      ['CAD','Canadian Dollar','CA$'],['AUD','Australian Dollar','A$'],
      ['GMD','Gambian Dalasi','D'],['GHS','Ghanaian Cedi','₵'],['NGN','Nigerian Naira','₦'],
      ['XOF','West African CFA Franc','CFA'],['XAF','Central African CFA Franc','FCFA'],
      ['KES','Kenyan Shilling','KSh'],['UGX','Ugandan Shilling','USh'],
      ['TZS','Tanzanian Shilling','TSh'],['RWF','Rwandan Franc','FRw'],
      ['ETB','Ethiopian Birr','Br'],['EGP','Egyptian Pound','£'],
      ['MAD','Moroccan Dirham','د.م.'],['DZD','Algerian Dinar','دج'],
      ['TND','Tunisian Dinar','د.ت'],['LYD','Libyan Dinar','LD'],
      ['ZAR','South African Rand','R'],['BWP','Botswana Pula','P'],
      ['NAD','Namibian Dollar','N$'],['ZMW','Zambian Kwacha','ZK'],
      ['MWK','Malawian Kwacha','MK'],['MZN','Mozambican Metical','MT'],
      ['SLL','Sierra Leonean Leone','Le'],['LRD','Liberian Dollar','L$'],
      ['AOA','Angolan Kwanza','Kz'],['BIF','Burundian Franc','Fr'],
      ['CVE','Cape Verdean Escudo','$'],['KMF','Comorian Franc','Fr'],
      ['CDF','Congolese Franc','Fr'],['DJF','Djiboutian Franc','Fr'],
      ['ERN','Eritrean Nakfa','Nfk'],['SZL','Swazi Lilangeni','L'],
      ['GNF','Guinean Franc','Fr'],['LSL','Lesotho Loti','L'],
      ['MGA','Malagasy Ariary','Ar'],['MRU','Mauritanian Ouguiya','UM'],
      ['MUR','Mauritian Rupee','₨'],['SCR','Seychellois Rupee','₨'],
      ['SOS','Somali Shilling','Sh'],['SSP','South Sudanese Pound','£'],
      ['SDG','Sudanese Pound','£'],['STN','São Tomé Dobra','Db'],
      ['ZWL','Zimbabwean Dollar','Z$'],['PKR','Pakistani Rupee','₨'],
      ['INR','Indian Rupee','₹'],['TRY','Turkish Lira','₺'],
      ['IDR','Indonesian Rupiah','Rp'],['BDT','Bangladeshi Taka','৳'],
    ]
    for (const c of CURRENCIES) curi.run(...c)
  }
  try { _seedRef() } catch(e) { console.error('[DB] Ref seed error:', e.message) }

  console.log('[DB] Schema applied successfully')
}
