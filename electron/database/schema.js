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
    CREATE INDEX IF NOT EXISTS idx_users_org         ON users(organization_id);
    CREATE INDEX IF NOT EXISTS idx_hifz_student      ON hifz_milestones(student_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_org      ON expenses(organization_id);
    CREATE INDEX IF NOT EXISTS idx_salaries_org      ON salaries(organization_id);
  `)

  console.log('[DB] Schema applied successfully')
}
