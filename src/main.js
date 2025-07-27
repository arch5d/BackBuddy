const { app, BrowserWindow, Notification, Tray } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');

let tray = null;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 350,
    height: 450,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false,
    icon: path.join(__dirname, 'icon.ico') // optional window icon
  });

  win.loadFile('index.html');
};

app.whenReady().then(() => {
  createWindow();

  // Auto-launch on startup
  const autoLauncher = new AutoLaunch({ name: 'Posture Reminder' });
  autoLauncher.enable();

  // Set up tray icon
  tray = new Tray(path.join(__dirname, 'icon.ico'));
  tray.setToolTip('Posture Reminder');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
