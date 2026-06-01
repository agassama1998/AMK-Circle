/**
 * AMK Circle — Screenshot capture script
 * Usage: node screenshots/capture.js
 */

const puppeteer = require('puppeteer')
const path = require('path')
const http  = require('http')

const BASE = 'http://localhost:8080'
const OUT  = __dirname
const W = 1440, H = 900

function apiFetch(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = http.request(`${BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => resolve(JSON.parse(raw)))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function injectSession(page, username, password) {
  const result = await apiFetch('/api/auth/login', { username, password })
  if (!result.success) throw new Error(`Login failed for ${username}: ${result.message}`)
  await page.evaluateOnNewDocument((user, token) => {
    sessionStorage.setItem('amk_user',  JSON.stringify(user))
    sessionStorage.setItem('amk_token', token)
  }, result.user, result.token)
}

async function go(page, url, wait = 1500) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2', timeout: 20000 })
  await new Promise(r => setTimeout(r, wait))
}

async function shot(page, filename) {
  await page.screenshot({ path: path.join(OUT, filename) })
  console.log('✓', filename)
}

;(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: W, height: H },
  })

  try {
    // ── 01 Login page ─────────────────────────────────────────────────────────
    const loginPage = await browser.newPage()
    await go(loginPage, '/login', 800)
    await shot(loginPage, '01-login.png')
    await loginPage.close()

    // ── Super Admin pages ─────────────────────────────────────────────────────
    const superPage = await browser.newPage()
    await injectSession(superPage, 'superadmin', 'Admin@123!')

    await go(superPage, '/super', 1500)
    await shot(superPage, '02-super-dashboard.png')

    await go(superPage, '/super/organizations', 1200)
    await shot(superPage, '03-organizations.png')

    await go(superPage, '/super/audit-logs', 1200)
    await shot(superPage, '04-audit-logs.png')
    await superPage.close()

    // ── Org pages ─────────────────────────────────────────────────────────────
    const p = await browser.newPage()
    await injectSession(p, 'iecc_admin', 'Admin@123!')

    await go(p, '/', 1500)
    await shot(p, '05-org-dashboard.png')

    await go(p, '/school/students', 1200)
    await shot(p, '06-students.png')

    await go(p, '/school/parents', 1200)
    await shot(p, '07-parents.png')

    await go(p, '/school/teachers', 1200)
    await shot(p, '08-teachers.png')

    await go(p, '/school/classes', 1200)
    await shot(p, '09-classes.png')

    await go(p, '/school/subjects', 1200)
    await shot(p, '10-subjects.png')

    await go(p, '/school/exams', 1200)
    await shot(p, '11-exams.png')

    await go(p, '/school/attendance', 1200)
    await shot(p, '12-attendance.png')

    await go(p, '/finance', 1200)
    await shot(p, '13-finance.png')

    await go(p, '/finance/expenses', 1200)
    await shot(p, '14-expenses.png')

    await go(p, '/finance/salaries', 1200)
    await shot(p, '15-salaries.png')

    await go(p, '/masjid', 1200)
    await shot(p, '16-masjid.png')

    await go(p, '/dara/hifz', 1200)
    await shot(p, '17-hifz.png')

    await go(p, '/dara/boarding', 1200)
    await shot(p, '18-boarding.png')

    await go(p, '/reports', 1800)
    await shot(p, '19-reports.png')

    await go(p, '/settings', 1200)
    await shot(p, '20-settings.png')

    await p.close()
  } finally {
    await browser.close()
  }

  console.log('\nAll screenshots saved to screenshots/')
})()
