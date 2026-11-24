import { app, BrowserWindow, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';

// Suppress Electron Dev CSP warning in dev mode (Electron notes it won't show in packaged app anyway)
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../public/logo.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Rajalakshmy Associates - Corporate CRM',
    icon: iconPath,
    backgroundColor: '#FAF6EF',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  try {
    mainWindow.setIcon(iconPath);
  } catch (err) {
    console.warn('Failed to set window icon:', err);
  }

  // Developer Shortcuts: Press F12 or Ctrl+Shift+I to toggle Developer Tools anytime
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      // Toggle DevTools with F12 or Ctrl + Shift + I (or Cmd + Option + I on macOS)
      if (
        input.key === 'F12' ||
        ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i')
      ) {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }

      // Quick Reload with F5 or Ctrl + R
      if (
        input.key === 'F5' ||
        ((input.control || input.meta) && input.key.toLowerCase() === 'r')
      ) {
        mainWindow.reload();
        event.preventDefault();
      }
    }
  });

  // Make external links open in default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) {
    // Development mode: load Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    // Production mode: load built dist/index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Automatic Background Update Checker for Client
  if (!isDev) {
    try {
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;

      autoUpdater.on('update-available', (info) => {
        if (mainWindow) {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'New Update Available',
            message: `A new version (v${info.version}) of Rajalakshmy Associates CRM is available. Downloading update in background...`,
            buttons: ['OK']
          });
        }
      });

      autoUpdater.on('update-downloaded', (info) => {
        if (mainWindow) {
          dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Update Ready to Install',
            message: `Version v${info.version} has been downloaded. Restart the application now to apply the updates?`,
            buttons: ['Restart & Install Now', 'Later']
          }).then((result) => {
            if (result.response === 0) {
              autoUpdater.quitAndInstall();
            }
          });
        }
      });

      autoUpdater.on('error', (err) => {
        console.warn('Auto-updater notice:', err?.message || err);
      });

      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.warn('Update check failed:', err?.message);
      });
    } catch (err) {
      console.warn('Auto-updater initialization error:', err);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
