const { ipcRenderer } = require('electron');

const uiState = {
  isActive: false,
  isPaused: false,
  error: ''
};

function setButtonState(toggleBtn, isActive) {
  if (isActive) {
    toggleBtn.textContent = 'Stop Reminders';
    toggleBtn.classList.add('stop');
  } else {
    toggleBtn.textContent = 'Start Reminders';
    toggleBtn.classList.remove('stop');
  }
}

function renderStatus(statusBadge) {
  statusBadge.classList.remove('active', 'paused', 'error');

  if (uiState.error) {
    statusBadge.textContent = `Status: Error - ${uiState.error}`;
    statusBadge.classList.add('error');
    return;
  }

  if (uiState.isActive && uiState.isPaused) {
    statusBadge.textContent = 'Status: Paused';
    statusBadge.classList.add('paused');
    return;
  }

  if (uiState.isActive) {
    statusBadge.textContent = 'Status: Active';
    statusBadge.classList.add('active');
    return;
  }

  statusBadge.textContent = 'Status: Inactive';
}

function syncStateToUI(toggleBtn, statusBadge, payload) {
  uiState.isActive = Boolean(payload?.isActive);
  uiState.isPaused = Boolean(payload?.isPaused);
  uiState.error = '';

  setButtonState(toggleBtn, uiState.isActive);
  renderStatus(statusBadge);
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const timeInput = document.getElementById('interval');
  const messageInput = document.getElementById('message');
  const statusBadge = document.getElementById('statusBadge');
  const testNotificationLink = document.getElementById('testNotificationLink');

  ipcRenderer.invoke('reminder:get-state').then((state) => {
    syncStateToUI(toggleBtn, statusBadge, state);
  });

  ipcRenderer.on('reminder:state-changed', (_event, state) => {
    syncStateToUI(toggleBtn, statusBadge, state);
  });

  toggleBtn.addEventListener('click', async () => {
    if (uiState.isActive) {
      const stopResult = await ipcRenderer.invoke('reminder:stop');

      if (!stopResult.ok) {
        uiState.error = stopResult.error || 'Failed to stop reminder service.';
      }

      syncStateToUI(toggleBtn, statusBadge, stopResult.state || { isActive: false, isPaused: false });
      renderStatus(statusBadge);
      return;
    }

    const minutes = Number.parseInt(timeInput.value, 10);
    const message = messageInput.value || 'Time to fix your posture!';

    if (Number.isNaN(minutes) || minutes <= 0) {
      uiState.error = 'Please enter a valid number of minutes.';
      renderStatus(statusBadge);
      return;
    }

    const startResult = await ipcRenderer.invoke('reminder:start', { minutes, message });

    if (!startResult.ok) {
      uiState.error = startResult.error || 'Failed to start reminder service.';
      renderStatus(statusBadge);
      return;
    }

    syncStateToUI(toggleBtn, statusBadge, startResult.state);
  });

  testNotificationLink.addEventListener('click', async (event) => {
    event.preventDefault();

    const message = messageInput.value || 'This is a BackBuddy test notification.';
    const testResult = await ipcRenderer.invoke('reminder:test-notification', { message });

    if (!testResult.ok) {
      uiState.error = testResult.error || 'Failed to send test notification.';
      renderStatus(statusBadge);
      return;
    }

    uiState.error = '';
    renderStatus(statusBadge);
  });
});