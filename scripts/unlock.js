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

    // Touch support - improved
    this.eyeContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleEyeClick(e);
    }, {passive: false});

    document.addEventListener('touchmove', (e) => {
      this.handleTouchMove(e);
    }, {passive: true}); // passive for better scroll performance

    // Prevent context menu on long press
    this.eyeContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
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

  async startUnlockSequence() {
    console.log('Unlock sequence started');

    // Phase 1: Switch to sewn eye
    await this.showSewnEye();

    // Phase 2: Red flash
    await this.redFlash();

    // Phase 3: Glitch effects
    await this.glitchEffect();

    // Phase 4: Reveal desktop
    await this.revealDesktop();
  },

  async showSewnEye() {
    return new Promise(resolve => {
      // Switch image
      this.eyeImage.src = 'assets/images/eye-sewn.png';

      // Sewing animation (if we had it)
      setTimeout(resolve, 500);
    });
  },

  async redFlash() {
    return new Promise(resolve => {
      const flashOverlay = document.createElement('div');
      flashOverlay.id = 'flash-overlay';
      flashOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--color-red);
        z-index: 30000;
        animation: flash 0.1s ease-in-out 3;
      `;

      document.body.appendChild(flashOverlay);

      setTimeout(() => {
        flashOverlay.remove();
        resolve();
      }, 300);
    });
  },

  async glitchEffect() {
    return new Promise(resolve => {
      const canvas = document.getElementById('glitch-canvas');
      if (!canvas) {
        resolve();
        return;
      }

      canvas.style.opacity = '1';
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve();
        return;
      }

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Glitch characters
      const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~';
      const colors = ['#FFFFFF', '#FF0000'];

      let frame = 0;
      const maxFrames = 30; // ~0.5s at 60fps

      const drawGlitch = () => {
        if (frame >= maxFrames) {
          canvas.style.opacity = '0';
          resolve();
          return;
        }

        // Clear with slight fade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw random characters
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const char = chars[Math.floor(Math.random() * chars.length)];
          const color = colors[Math.floor(Math.random() * colors.length)];

          ctx.fillStyle = color;
          ctx.font = `${20 + Math.random() * 30}px monospace`;
          ctx.fillText(char, x, y);
        }

        frame++;
        requestAnimationFrame(drawGlitch);
      };

      drawGlitch();
    });
  },

  async revealDesktop() {
    return new Promise(resolve => {
      // Add shake effect to unlock layer
      const unlockLayer = document.getElementById('unlock-layer');
      unlockLayer.style.animation = 'shake 0.3s ease-in-out';

      setTimeout(() => {
        // Fade out unlock layer
        unlockLayer.style.transition = 'opacity 1s ease-out';
        unlockLayer.style.opacity = '0';

        setTimeout(() => {
          if (window.WorkspaceCore && window.WorkspaceCore.showLayer) {
            WorkspaceCore.showLayer('desktop');
            WorkspaceCore.state.isLocked = false;
          }
          unlockLayer.style.opacity = '1';
          unlockLayer.style.animation = '';
          resolve();
        }, 1000);
      }, 300);
    });
  }
};

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UnlockSystem.init());
} else {
  UnlockSystem.init();
}

window.UnlockSystem = UnlockSystem;
