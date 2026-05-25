const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs   = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    backgroundColor: '#f0faf4',
    titleBarStyle: 'hiddenInset',
    frame: true,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (isDev) mainWindow.maximize()
  })

  mainWindow.setMenuBarVisibility(false)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  const { initDatabase } = require('./database/db')
  await initDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function registerIpcHandlers() {
  // ─── Module handlers ──────────────────────────────────────────────────────
  const handlerModules = [
    './handlers/auth',
    './handlers/organizations',
    './handlers/users',
    './handlers/students',
    './handlers/parents',
    './handlers/teachers',
    './handlers/classes',
    './handlers/subjects',
    './handlers/exams',
    './handlers/attendance',
    './handlers/masjid',
    './handlers/finance',
    './handlers/dara',
    './handlers/reports',
    './handlers/settings',
  ]

  for (const mod of handlerModules) {
    const handlers = require(mod)
    for (const [channel, handler] of Object.entries(handlers)) {
      ipcMain.handle(channel, handler)
    }
  }

  // ─── System handlers ──────────────────────────────────────────────────────
  ipcMain.handle('dialog:showSave', async (_, opts) => dialog.showSaveDialog(mainWindow, opts))
  ipcMain.handle('dialog:showOpen', async (_, opts) => dialog.showOpenDialog(mainWindow, opts))
  ipcMain.handle('shell:openPath',  async (_, p)    => shell.openPath(p))
  ipcMain.handle('app:getVersion',  async ()        => app.getVersion())

  // Write a base64-encoded file to disk (used by Excel export)
  ipcMain.handle('fs:writeBase64', async (_, { path: filePath, data }) => {
    try {
      const buf = Buffer.from(data, 'base64')
      fs.writeFileSync(filePath, buf)
      shell.openPath(filePath) // open the file after saving
      return { success: true }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('db:backup', async () => {
    const { getDbPath } = require('./database/db')
    const stamp = new Date().toISOString().slice(0, 10)
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Backup AMK Circle Database',
      defaultPath: `amkcircle-backup-${stamp}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    })
    if (!result.canceled) {
      fs.copyFileSync(getDbPath(), result.filePath)
      return { success: true, path: result.filePath }
    }
    return { success: false }
  })

  ipcMain.handle('db:restore', async () => {
    const { getDbPath } = require('./database/db')
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Restore AMK Circle Database',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (!result.canceled && result.filePaths[0]) {
      fs.copyFileSync(result.filePaths[0], getDbPath())
      app.relaunch()
      app.exit(0)
      return { success: true }
    }
    return { success: false }
  })
}
