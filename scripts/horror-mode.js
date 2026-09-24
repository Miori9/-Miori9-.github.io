const HorrorMode = {
  isActive: false,
  animationFrame: null,
  dockEyes: [],
  eyeIntervals: [],
  lastDrift: 0,
  nextFlicker: 0,
  flickerAnimations: [],

  toggle() {
    if (this.isActive) {
      this.exit();
    } else {
      this.enter();
    }
  },

  async enter() {
    if (this.isActive) return;
    this.isActive = true;

    // Flash
    this.flash();
    await this.wait(300);
    if (!this.isActive) return;

    // Toggle CSS
    document.body.classList.add('abyss');

    // Spawn dock eyes
    this.spawnDockEyes();

    // Start continuous effects
    this.startContinuousEffects();
  },

  exit() {
    if (!this.isActive) return;
    this.isActive = false;

    // Stop continuous effects
    this.stopContinuousEffects();

    // Remove dock eyes
    this.removeDockEyes();

    // Remove CSS
    document.body.classList.remove('abyss');
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

  wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  },

  // ── Dock Eyes ──
  spawnDockEyes() {
    const bar = document.getElementById('dock-bar');
    if (!bar) return;

    const count = 8 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const eye = document.createElement('div');
      eye.className = 'dock-eye';

      const size = 14 + Math.random() * 10;
      eye.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${3 + Math.random() * 88}%;
        top: ${-size * 0.3 + Math.random() * (bar.offsetHeight - size * 0.4)}px;
        animation-delay: ${i * 0.15}s;
        opacity: 0;
      `;

      bar.appendChild(eye);
      this.dockEyes.push(eye);

      // Independent blink
      const blinkInterval = setInterval(() => {
        eye.classList.add('blink');
        setTimeout(() => eye.classList.remove('blink'), 150);
      }, 2000 + Math.random() * 4000);

      // Occasional eye movement (pupil jitter)
      const moveInterval = setInterval(() => {
        const jx = (Math.random() - 0.5) * 3;
        eye.style.transform = `translateX(${jx}px)`;
        setTimeout(() => { eye.style.transform = ''; }, 500);
      }, 3000 + Math.random() * 5000);

      this.eyeIntervals.push(blinkInterval, moveInterval);
    }
  },

  removeDockEyes() {
    this.dockEyes.forEach(eye => eye.remove());
    this.dockEyes = [];
    this.eyeIntervals.forEach(id => clearInterval(id));
    this.eyeIntervals = [];
  },

  // ── Continuous Effects ──
  startContinuousEffects() {
    this.nextFlicker = 0;
    const animate = (timestamp) => {
      if (!this.isActive) return;

      // Drift wallpaper collage elements every ~3s
      if (timestamp - this.lastDrift > 3000) {
        this.driftCollage();
        this.lastDrift = timestamp;
      }

      // Short local flickers, at irregular intervals independent of frame rate.
      if (timestamp >= this.nextFlicker) {
        this.flickerDesktop();
        this.nextFlicker = timestamp + 1800 + Math.random() * 3200;
      }

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  },

  stopContinuousEffects() {
    this.flickerAnimations.forEach(animation => animation.cancel());
    this.flickerAnimations = [];
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Reset any drifted collage elements
    if (window.WallpaperSystem) {
      WallpaperSystem.collageElements.forEach(el => {
        el.style.transition = 'transform 1s ease-out';
        el.style.transform = el.dataset.originalTransform || '';
      });
    }
  },

  driftCollage() {
    if (!window.WallpaperSystem) return;

    WallpaperSystem.collageElements.forEach(el => {
      if (!el.dataset.originalTransform) {
        el.dataset.originalTransform = el.style.transform || '';
      }

      const dx = (Math.random() - 0.5) * 20;
      const dy = (Math.random() - 0.5) * 10;
      const dr = (Math.random() - 0.5) * 8;
      const base = el.dataset.originalTransform;

      el.style.transition = 'transform 3s ease-in-out';
      el.style.transform = `${base} translate(${dx}px, ${dy}px) rotate(${dr}deg)`;
    });
  },

  flickerDesktop() {
    this.flickerAnimations.forEach(animation => animation.cancel());
    this.flickerAnimations = [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const selector of ['.desktop-file .file-icon', '.window:not(.minimized) .window-title']) {
      const elements = document.querySelectorAll(selector);
      if (!elements.length) continue;
      const element = elements[Math.floor(Math.random() * elements.length)];
      this.flickerAnimations.push(element.animate(
        [{ opacity: 1 }, { opacity: 0.18 }, { opacity: 1 }],
        { duration: 180 + Math.random() * 140 }
      ));
    }
  },
};

// Keyboard shortcut: Ctrl/Cmd + Shift + D
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    HorrorMode.toggle();
  }
});

window.HorrorMode = HorrorMode;
