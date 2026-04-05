const { app, BrowserWindow, Tray, Menu, Notification, ipcMain } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;
let reminderInterval = null;
let isQuitting = false;

const reminderState = {
  isActive: false,
  isPaused: false,
  minutes: null,
  message: 'Time to fix your posture!'
};

function getNotificationIconPath() {
  return path.join(__dirname, 'src', 'icon.ico');
}

function broadcastReminderState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('reminder:state-changed', { ...reminderState });
  }
}

function buildReminderInterval(minutes, message) {
  const intervalMs = minutes * 60 * 1000;

  reminderInterval = setInterval(() => {
    const notification = new Notification({
      title: 'BackBuddy - Posture Check',
      body: message,
      icon: getNotificationIconPath(),
      silent: false
    });

    notification.show();
  }, intervalMs);
}

function stopReminderService() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }

  reminderState.isActive = false;
  reminderState.isPaused = false;
  broadcastReminderState();
  refreshTrayMenu();
}

function pauseReminderService() {
  if (!reminderState.isActive) {
    return;
  }

  clearInterval(reminderInterval);
  reminderInterval = null;
  reminderState.isPaused = true;
  broadcastReminderState();
  refreshTrayMenu();
}

function resumeReminderService() {
  if (!reminderState.isActive || !reminderState.isPaused || !reminderState.minutes) {
    return;
  }

  buildReminderInterval(reminderState.minutes, reminderState.message);
  reminderState.isPaused = false;
  broadcastReminderState();
  refreshTrayMenu();
}

function showMainWindow() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function refreshTrayMenu() {
  if (!tray) {
    return;
  }

  const pauseLabel = reminderState.isPaused ? 'Resume Reminders' : 'Pause Reminders';

  const trayMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => showMainWindow()
    },
    {
      label: pauseLabel,
      enabled: reminderState.isActive,
      click: () => {
        if (reminderState.isPaused) {
          resumeReminderService();
        } else {
          pauseReminderService();
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(trayMenu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 580,
    resizable: false,
    icon: path.join(__dirname, 'src', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.archita.backbuddy');

  createWindow();

  tray = new Tray(path.join(__dirname, 'src', 'icon.ico'));
  tray.setToolTip('BackBuddy');
  tray.on('double-click', () => showMainWindow());
  refreshTrayMenu();

  ipcMain.handle('reminder:get-state', async () => {
    return { ...reminderState };
  });

  ipcMain.handle('reminder:start', async (_event, payload) => {
    try {
      const minutes = Number(payload?.minutes);
      const message = (payload?.message || 'Time to fix your posture!').trim();

      if (!Number.isFinite(minutes) || minutes <= 0) {
        throw new Error('Please enter a valid number of minutes.');
      }

      if (!Notification.isSupported()) {
        throw new Error('Desktop notifications are not supported on this system.');
      }

      if (reminderInterval) {
        clearInterval(reminderInterval);
      }

      reminderState.minutes = minutes;
      reminderState.message = message || 'Time to fix your posture!';
      reminderState.isActive = true;
      reminderState.isPaused = false;

      buildReminderInterval(reminderState.minutes, reminderState.message);
      broadcastReminderState();
      refreshTrayMenu();

      return {
        ok: true,
        state: { ...reminderState }
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message || 'Failed to start reminder service.'
      };
    }
  });

  ipcMain.handle('reminder:stop', async () => {
    stopReminderService();
    return {
      ok: true,
      state: { ...reminderState }
    };
  });

  ipcMain.handle('reminder:test-notification', async (_event, payload) => {
    try {
      if (!Notification.isSupported()) {
        throw new Error('Desktop notifications are not supported on this system.');
      }

      const message = (payload?.message || 'This is a BackBuddy test notification.').trim();
      const notification = new Notification({
        title: 'BackBuddy Test',
        body: message,
        icon: getNotificationIconPath(),
        silent: false
      });

      notification.show();

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error.message || 'Failed to send test notification.'
      };
    }
  });


  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      refreshTrayMenu();
    } else {
      showMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (reminderInterval) {
    clearInterval(reminderInterval);
  }
});
