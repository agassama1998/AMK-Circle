'use strict'

// ─── Mock `electron` before anything else loads it ───────────────────────────
// In Docker / server mode, electron is not installed.
// All handlers do `require('../database/db')` which does `const { app } = require('electron')`.
// We intercept the require so they get a harmless null instead of a crash.
const Module = require('module')
const _origLoad = Module._load.bind(Module)
Module._load = (request, parent, isMain) => {
  if (request === 'electron') return { app: null }
  return _origLoad(request, parent, isMain)
}

// ─────────────────────────────────────────────────────────────────────────────

const express = require('express')
const path    = require('path')
const fs      = require('fs')

const PORT = parseInt(process.env.PORT || '3000', 10)
const DIST = path.join(__dirname, '..', 'dist')

// Read the browser api-shim once at startup
const SHIM_CODE = fs.readFileSync(path.join(__dirname, 'api-shim.js'), 'utf-8')
const SHIM_TAG  = `<script>${SHIM_CODE}</script>`

function serveIndex (_, res) {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8')
    .replace('</head>', SHIM_TAG + '</head>')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
;(async () => {
  // Init SQLite (creates tables + seeds if empty)
  const { initDatabase } = require('../electron/database/db')
  await initDatabase()
  console.log('[DB] Ready')

  // ─── Load all IPC handler modules ────────────────────────────────────────
  const handlerFiles = [
    '../electron/handlers/auth',
    '../electron/handlers/organizations',
    '../electron/handlers/users',
    '../electron/handlers/students',
    '../electron/handlers/teachers',
    '../electron/handlers/classes',
    '../electron/handlers/attendance',
    '../electron/handlers/masjid',
    '../electron/handlers/finance',
    '../electron/handlers/dara',
    '../electron/handlers/reports',
    '../electron/handlers/settings',
  ]
  const handlers = {}
  for (const f of handlerFiles) Object.assign(handlers, require(f))
  console.log(`[IPC] Loaded ${Object.keys(handlers).length} handlers`)

  // ─── Express ─────────────────────────────────────────────────────────────
  const app = express()
  app.use(express.json({ limit: '10mb' }))

  // Health-check (used by docker-compose healthcheck)
  app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }))

  // ── Dynamic IPC → REST bridge ─────────────────────────────────────────────
  // POST /api/:module/:action  →  handlers['module:action'](null, body)
  //
  // Examples:
  //   POST /api/auth/login      → handlers['auth:login']
  //   POST /api/students/getAll → handlers['students:getAll']
  app.post('/api/:mod/:action', async (req, res) => {
    const channel = `${req.params.mod}:${req.params.action}`
    const handler = handlers[channel]
    if (!handler) {
      return res.status(404).json({ success: false, message: `Unknown channel: ${channel}` })
    }
    try {
      const result = await handler(null, req.body || {})
      res.json(result)
    } catch (e) {
      console.error(`[${channel}]`, e.message)
      res.status(500).json({ success: false, message: e.message })
    }
  })

  // ── Static assets (JS/CSS/images from Vite build) ────────────────────────
  app.use(express.static(DIST, { index: false }))

  // ── SPA — inject window.api shim into every HTML response ────────────────
  app.get('/', serveIndex)
  app.get('*', (req, res) => {
    // Let real static files through; only intercept HTML navigation
    const file = path.join(DIST, req.path)
    if (fs.existsSync(file) && !fs.statSync(file).isDirectory()) {
      return res.sendFile(file)
    }
    serveIndex(req, res)
  })

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AMK Circle] ✓ http://0.0.0.0:${PORT}`)
  })
})()
