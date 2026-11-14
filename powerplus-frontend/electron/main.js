/**
 * PowerPlus — Electron main process.
 * Wraps the live dashboard (same model as the Android TWA):
 * the shell is local, the content is the Vercel site, so every
 * deploy reaches installed users automatically.
 *
 * ESM: this app's package.json sets "type": "module".
 */
import { app, BrowserWindow, Menu, shell } from 'electron'

const SITE_URL = 'https://power-plus-sandy.vercel.app'

// Only one instance at a time — second launch focuses the existing window.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'PowerPlus | Energy Monitoring',
    backgroundColor: '#0B1620',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  Menu.setApplicationMenu(null)

  // Load the live dashboard; show the window once content is ready.
  win.loadURL(SITE_URL)
  win.once('ready-to-show', () => win.show())

  // Open any target=_blank / external link in the system browser
  // instead of spawning new Electron windows.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
