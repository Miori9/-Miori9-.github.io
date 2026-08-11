const UnlockSystem = {
  eyeImage: null,
  eyeContainer: null,
  isTracking: false,
  blinkInterval: null,

  init() {
    this.eyeImage = document.getElementById('eye-image');
    this.eyeContainer = document.getElementById('eye-container');

    if (!this.eyeImage || !this.eyeContainer) {
      console.error('Eye elements not found');
      return;
    }

    this.setupEventListeners();
    this.startBlinking();
  },

  setupEventListeners() {
    // Mouse tracking
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));

    // Click to unlock
    this.eyeContainer.addEventListener('click', this.handleEyeClick.bind(this));

    // Touch support
    this.eyeContainer.addEventListener('touchstart', this.handleEyeClick.bind(this), {passive: false});
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), {passive: false});
  },

  handleMouseMove(e) {
    if (!this.isTracking) {
      this.trackMouse(e.clientX, e.clientY);
    }
  },

  handleTouchMove(e) {
    if (!this.isTracking && e.touches.length > 0) {
      const touch = e.touches[0];
      this.trackMouse(touch.clientX, touch.clientY);
    }
  },

  trackMouse(x, y) {
    const rect = this.eyeContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = x - centerX;
    const deltaY = y - centerY;

    const maxMove = 15;
    const moveX = Math.max(-maxMove, Math.min(maxMove, deltaX / 10));
    const moveY = Math.max(-maxMove, Math.min(maxMove, deltaY / 10));

    this.eyeImage.style.transform = `translate(${moveX}px, ${moveY}px)`;
  },

  startBlinking() {
    this.blinkInterval = setInterval(() => {
      if (!this.isTracking) {
        this.blink();
      }
    }, 3000 + Math.random() * 5000);
  },

  blink() {
    this.eyeImage.style.opacity = '0';
    setTimeout(() => {
      this.eyeImage.style.opacity = '1';
    }, 150);
  },

  handleEyeClick(e) {
    e.preventDefault();
    if (this.isTracking) return;

    this.isTracking = true;
    clearInterval(this.blinkInterval);

    this.startUnlockSequence();
  },

  startUnlockSequence() {
    console.log('Unlock sequence started');
    // Transition to desktop layer
    if (window.WorkspaceCore && window.WorkspaceCore.showLayer) {
      window.WorkspaceCore.showLayer('desktop');
    }
  }
};

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UnlockSystem.init());
} else {
  UnlockSystem.init();
}

window.UnlockSystem = UnlockSystem;
