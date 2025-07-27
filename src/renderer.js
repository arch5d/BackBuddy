let intervalId;

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const timeInput = document.getElementById('interval');
  const messageInput = document.getElementById('message');

  startBtn.addEventListener('click', () => {
    const minutes = parseInt(timeInput.value);
    const message = messageInput.value || "Time to fix your posture!";
    if (isNaN(minutes) || minutes <= 0) return alert("Please enter a valid number of minutes.");

    clearInterval(intervalId);
    intervalId = setInterval(() => {
      new Notification("Posture Check", { body: message }).show();
    }, minutes * 60 * 1000);
  });

  stopBtn.addEventListener('click', () => {
    clearInterval(intervalId);
    alert("Reminders stopped!");
  });
});