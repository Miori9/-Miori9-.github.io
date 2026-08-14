const PomodoroApp = {
  WORK_DURATION: 25 * 60,
  BREAK_DURATION: 5 * 60,

  container: null,
  timeEl: null,
  ringEl: null,
  modeEl: null,
  startBtn: null,
  pauseBtn: null,
  resetBtn: null,

  remaining: 25 * 60,
  total: 25 * 60,
  isRunning: false,
  isBreak: false,
  intervalId: null,

  launch() {
    const content = document.createElement('div');
    this.container = content;

    const circumference = 2 * Math.PI * 80; // r=80

    content.innerHTML = `
      <div class="pomodoro-container">
        <div class="pomodoro-ring-wrap">
          <svg class="pomodoro-ring" viewBox="0 0 180 180">
            <circle class="pomodoro-ring-bg" cx="90" cy="90" r="80"/>
            <circle class="pomodoro-ring-progress" cx="90" cy="90" r="80"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="0"/>
          </svg>
          <div class="pomodoro-time">25:00</div>
        </div>
        <div class="pomodoro-mode">WORK</div>
        <div class="pomodoro-controls">
          <button class="pomodoro-btn" data-action="start">START</button>
          <button class="pomodoro-btn" data-action="pause">PAUSE</button>
          <button class="pomodoro-btn" data-action="reset">RESET</button>
        </div>
      </div>
    `;

    this.timeEl = content.querySelector('.pomodoro-time');
    this.ringEl = content.querySelector('.pomodoro-ring-progress');
    this.modeEl = content.querySelector('.pomodoro-mode');
    this.startBtn = content.querySelector('[data-action="start"]');
    this.pauseBtn = content.querySelector('[data-action="pause"]');
    this.resetBtn = content.querySelector('[data-action="reset"]');

    this.startBtn.addEventListener('click', () => this.start());
    this.pauseBtn.addEventListener('click', () => this.pause());
    this.resetBtn.addEventListener('click', () => this.reset());

    this.updateDisplay();

    WindowManager.create('pomodoro', 'Pomodoro', content, {
      width: 300,
      height: 380,
    });
  },

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startBtn.classList.add('active');

    this.intervalId = setInterval(() => {
      this.remaining--;

      if (this.remaining <= 0) {
        this.onTimerEnd();
        return;
      }

      this.updateDisplay();
    }, 1000);
  },

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.startBtn.classList.remove('active');
    clearInterval(this.intervalId);
    this.intervalId = null;
  },

  reset() {
    this.pause();
    this.isBreak = false;
    this.remaining = this.WORK_DURATION;
    this.total = this.WORK_DURATION;
    this.updateDisplay();
    this.updateMode();
  },

  onTimerEnd() {
    this.pause();

    // Flash effect
    this.flash();

    // Switch mode
    if (this.isBreak) {
      // Break ended → back to work
      this.isBreak = false;
      this.remaining = this.WORK_DURATION;
      this.total = this.WORK_DURATION;
    } else {
      // Work ended → break
      this.isBreak = true;
      this.remaining = this.BREAK_DURATION;
      this.total = this.BREAK_DURATION;
    }

    this.updateDisplay();
    this.updateMode();

    // Auto-start next phase
    setTimeout(() => this.start(), 1000);
  },

  flash() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: #FF0000;
      z-index: 30000;
      animation: flash 0.15s ease-in-out 2;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 300);
  },

  updateDisplay() {
    if (!this.timeEl || !this.ringEl) return;

    const mins = Math.floor(this.remaining / 60);
    const secs = this.remaining % 60;
    this.timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Progress ring
    const circumference = 2 * Math.PI * 80;
    const progress = 1 - (this.remaining / this.total);
    this.ringEl.style.strokeDashoffset = circumference * (1 - progress);
  },

  updateMode() {
    if (!this.modeEl || !this.timeEl || !this.ringEl) return;

    if (this.isBreak) {
      this.modeEl.textContent = 'BREAK';
      this.timeEl.classList.add('break');
      this.ringEl.classList.add('break');
    } else {
      this.modeEl.textContent = 'WORK';
      this.timeEl.classList.remove('break');
      this.ringEl.classList.remove('break');
    }
  },

  onClose() {
    this.pause();
    this.container = null;
    this.timeEl = null;
    this.ringEl = null;
    this.modeEl = null;
  },
};

window.Apps = window.Apps || {};
window.Apps.pomodoro = PomodoroApp;
