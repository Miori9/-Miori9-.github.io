const UnlockSystem = {
  passwordInput: null,
  submitBtn: null,
  hintEl: null,
  passwordWrap: null,
  usernameEl: null,
  usernameZalgo: null,
  usernameWrap: null,
  lockScreen: null,
  unlockLayer: null,
  backgroundVideo: null,
  noiseCanvas: null,
  noiseCtx: null,
  isUnlocking: false,
  zalgoInterval: null,

  // Any non-empty input unlocks
  password: null,

  // Zalgo combining characters
  zalgoUp: [
    '̀','́','̂','̃','̄','̅','̆','̇',
    '̈','̉','̊','̋','̌','̍','̎','̏',
    '̐','̑','̒','̓','̔','̕','̚','̽',
    '̾','̿','̀','́','͂','̓','̈́','͆',
    '͊','͋','͌',
  ],
  zalgoDown: [
    '̖','̗','̘','̙','̜','̝','̞','̟',
    '̠','̡','̢','̣','̤','̥','̦','̧',
    '̨','̩','̪','̫','̬','̭','̮','̯',
    '̰','̱','̲','̳','̹','̺','̻','̼',
    'ͅ','͇','͈','͉',
  ],
  zalgoMid: [
    '̴','̵','̶','̷','̸',
  ],

  init() {
    this.passwordInput = document.getElementById('lock-password');
    this.submitBtn = document.getElementById('lock-submit');
    this.hintEl = document.getElementById('lock-hint');
    this.passwordWrap = document.getElementById('lock-password-wrap');
    this.usernameEl = document.getElementById('lock-username');
    this.usernameZalgo = document.getElementById('lock-username-zalgo');
    this.usernameWrap = document.getElementById('lock-username-wrap');
    this.lockScreen = document.getElementById('lock-screen');
    this.unlockLayer = document.getElementById('unlock-layer');
    this.backgroundVideo = document.getElementById('lock-video');
    this.noiseCanvas = document.getElementById('noise-canvas');

    if (!this.passwordInput || !this.submitBtn) {
      console.error('Lock screen elements not found');
      return;
    }

    if (this.noiseCanvas) {
      this.noiseCtx = this.noiseCanvas.getContext('2d');
    }

    this.setupEventListeners();
    this.startZalgoUsername();
    this.updateLabelVisibility();
    this.syncBackgroundVideo();
    new MutationObserver(() => this.syncBackgroundVideo()).observe(this.unlockLayer, {
      attributes: true, attributeFilter: ['class']
    });
    document.addEventListener('visibilitychange', () => this.syncBackgroundVideo());
    // A gesture can retry muted playback if the browser blocked autoplay.
    this.unlockLayer.addEventListener('pointerdown', () => {
      if (this.backgroundVideo?.paused) this.syncBackgroundVideo();
    });

    // Auto-focus password field
    setTimeout(() => this.passwordInput.focus(), 300);
  },

  syncBackgroundVideo() {
    if (!this.backgroundVideo) return;
    this.backgroundVideo.muted = true;
    if (document.hidden || this.unlockLayer.classList.contains('hidden')) {
      this.backgroundVideo.pause();
    } else {
      // Keep the poster visible if autoplay is unavailable (e.g. low-power mode).
      this.backgroundVideo.play().catch(() => {});
    }
  },

  // ── Label visibility ──
  updateLabelVisibility() {
    if (this.usernameWrap) {
      if (this.usernameEl.value.length > 0) {
        this.usernameWrap.classList.add('has-text');
      } else {
        this.usernameWrap.classList.remove('has-text');
      }
    }
  },

  // ── Zalgo text generator ──
  randFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  zalgoify(text, intensity) {
    const upCount = Math.floor(intensity * 6);
    const downCount = Math.floor(intensity * 6);
    const midCount = Math.floor(intensity * 2);

    let result = '';
    for (const char of text) {
      result += char;
      for (let i = 0; i < upCount; i++) result += this.randFrom(this.zalgoUp);
      for (let i = 0; i < midCount; i++) result += this.randFrom(this.zalgoMid);
      for (let i = 0; i < downCount; i++) result += this.randFrom(this.zalgoDown);
    }
    return result;
  },

  startZalgoUsername() {
    let tick = 0;

    const update = () => {
      const baseText = this.usernameEl.value;
      if (baseText.length === 0) {
        this.usernameZalgo.textContent = '';
        tick++;
        return;
      }
      const intensity = 0.3 + Math.sin(tick * 0.15) * 0.2 + Math.random() * 0.15;
      this.usernameZalgo.textContent = this.zalgoify(baseText, intensity);
      tick++;
    };

    this.usernameEl.addEventListener('input', () => {
      this.updateLabelVisibility();
      update();
    });

    update();
    this.zalgoInterval = setInterval(update, 200);
  },

  setupEventListeners() {
    this.passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.attemptUnlock();
      }
    });

    this.submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.attemptUnlock();
    });

    this.passwordInput.addEventListener('input', () => {
      this.hintEl.classList.remove('visible');
      this.hintEl.textContent = '';
    });
  },

  attemptUnlock() {
    if (this.isUnlocking) return;

    const value = this.passwordInput.value;

    if (this.password === null) {
      if (value.length === 0) {
        this.showWrongPassword();
        return;
      }
      this.startUnlockSequence();
      return;
    }

    if (value === this.password) {
      this.startUnlockSequence();
    } else {
      this.showWrongPassword();
    }
  },

  showWrongPassword() {
    this.passwordWrap.classList.remove('shake');
    void this.passwordWrap.offsetWidth;
    this.passwordWrap.classList.add('shake');

    this.hintEl.textContent = this.zalgoify('INCORRECT', 0.5);
    this.hintEl.classList.add('visible');

    this.passwordInput.value = '';
    this.passwordInput.focus();

    setTimeout(() => {
      this.passwordWrap.classList.remove('shake');
    }, 500);
  },

  // ── Snow / static noise renderer ──
  drawNoise(opacity) {
    if (!this.noiseCanvas || !this.noiseCtx) return;

    const c = this.noiseCanvas;
    const ctx = this.noiseCtx;

    // Use a smaller buffer and scale up for performance + chunky look
    const scale = 4;
    const w = Math.ceil(c.width / scale);
    const h = Math.ceil(c.height / scale);

    if (c.width !== window.innerWidth || c.height !== window.innerHeight) {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }

    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;       // R
      data[i + 1] = v;   // G
      data[i + 2] = v;   // B
      data[i + 3] = Math.random() * 180; // A — varying density
    }

    // Draw small then scale up for chunky TV static look
    ctx.putImageData(imageData, 0, 0);

    // Clear and redraw scaled
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, c.width, c.height);

    c.style.opacity = opacity;
  },

  // ── Unlock sequence: progressive disintegration ──
  async startUnlockSequence() {
    this.isUnlocking = true;
    this.passwordInput.disabled = true;
    this.submitBtn.disabled = true;
    this.usernameEl.disabled = true;

    clearInterval(this.zalgoInterval);

    // Phase 1: Zalgo escalation + noise creeps in
    await this.zalgoEscalation();

    // Phase 2: UI fragments scatter + noise intensifies
    await this.fragmentUI();

    // Phase 3: Full static takeover — total sanity loss
    await this.staticTakeover();

    // Phase 4: Noise slowly dissolves — reality reassembles
    await this.noiseFadeOut();

    // Phase 5: Fade to desktop
    await this.revealDesktop();
  },

  async zalgoEscalation() {
    return new Promise(resolve => {
      let intensity = 0.4;
      let tick = 0;

      const escalate = setInterval(() => {
        intensity += 0.06;
        const baseText = this.usernameEl.value || 'VOID';
        this.usernameZalgo.textContent = this.zalgoify(baseText, Math.min(intensity, 1.0));

        const jitter = (Math.random() - 0.5) * intensity * 8;
        this.usernameZalgo.style.transform = `translateX(${jitter}px)`;

        // Noise creeps in during Zalgo escalation
        const noiseOpacity = (tick / 20) * 0.15;
        this.drawNoise(noiseOpacity);

        tick++;
        if (tick > 20) {
          clearInterval(escalate);
          resolve();
        }
      }, 60);
    });
  },

  async fragmentUI() {
    return new Promise(resolve => {
      const elements = this.lockScreen.children;
      const fragments = [];

      for (const el of elements) {
        el.style.transition = 'none';
        el.style.position = 'relative';
        fragments.push({
          el,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 8 - 3,
          vr: (Math.random() - 0.5) * 15,
          x: 0, y: 0, r: 0,
          opacity: 1,
        });
      }

      // Spawn floating glitch characters
      const glitchChars = [];
      const glitchSymbols = '!@#$%^&*()_+-=[]{}|;:,.<>?/~̶̷̸■█▒░▓';
      for (let i = 0; i < 60; i++) {
        const span = document.createElement('span');
        span.className = 'fragment-char';
        span.textContent = glitchSymbols[Math.floor(Math.random() * glitchSymbols.length)];
        span.style.cssText = `
          position: fixed;
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
          font-family: monospace;
          font-size: ${10 + Math.random() * 28}px;
          color: ${Math.random() > 0.7 ? '#FF0000' : '#FFFFFF'};
          opacity: 0;
          pointer-events: none;
          z-index: 50;
        `;
        this.unlockLayer.appendChild(span);
        glitchChars.push({
          el: span,
          delay: Math.random() * 600,
          duration: 300 + Math.random() * 500,
          born: performance.now(),
        });
      }

      let frame = 0;
      const maxFrames = 50;
      const startTime = performance.now();

      const animate = () => {
        const now = performance.now();
        const elapsed = now - startTime;

        if (frame >= maxFrames) {
          glitchChars.forEach(g => g.el.remove());
          resolve();
          return;
        }

        const progress = frame / maxFrames;

        // ── Snow noise intensifies with progress ──
        const noiseOpacity = 0.15 + progress * 0.5;
        this.drawNoise(noiseOpacity);

        // Animate UI fragments drifting apart
        for (const f of fragments) {
          f.x += f.vx * (0.5 + progress);
          f.y += f.vy * (0.5 + progress);
          f.r += f.vr * progress;
          f.opacity = Math.max(0, 1 - progress * 1.5);

          f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.r}deg)`;
          f.el.style.opacity = f.opacity;

          if (progress > 0.2) {
            const split = progress * 6;
            f.el.style.textShadow = `${split}px 0 #FF0000, ${-split}px 0 #00FFFF`;
            f.el.style.filter = `blur(${progress * 2}px)`;
          }
        }

        // Fade in/out glitch characters
        for (const g of glitchChars) {
          const age = elapsed - g.delay;
          if (age < 0) continue;
          if (age > g.duration) {
            g.el.style.left = `${Math.random() * 100}%`;
            g.el.style.top = `${Math.random() * 100}%`;
            g.el.textContent = glitchSymbols[Math.floor(Math.random() * glitchSymbols.length)];
            g.delay = elapsed + Math.random() * 200;
            g.duration = 200 + Math.random() * 400;
            g.el.style.opacity = '0';
            continue;
          }
          const lifeProgress = age / g.duration;
          const charOpacity = lifeProgress < 0.3
            ? lifeProgress / 0.3
            : 1 - ((lifeProgress - 0.3) / 0.7);
          g.el.style.opacity = (charOpacity * 0.8 * (0.5 + progress)).toString();
        }

        // Horizontal tears
        if (Math.random() < progress * 0.3) {
          const tear = document.createElement('div');
          tear.style.cssText = `
            position: fixed;
            left: 0;
            top: ${Math.random() * 100}%;
            width: 100%;
            height: ${2 + Math.random() * 6}px;
            background: ${Math.random() > 0.5 ? '#FF0000' : '#FFFFFF'};
            opacity: ${0.1 + Math.random() * 0.3};
            pointer-events: none;
            z-index: 49;
          `;
          this.unlockLayer.appendChild(tear);
          setTimeout(() => tear.remove(), 50 + Math.random() * 100);
        }

        frame++;
        requestAnimationFrame(animate);
      };

      animate();
    });
  },

  async staticTakeover() {
    return new Promise(resolve => {
      const canvas = document.getElementById('glitch-canvas');
      if (!canvas) { resolve(); return; }

      canvas.style.opacity = '1';
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(); return; }

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~ERROR VOID NULL SIGNAL BREAK';
      const colors = ['#FFFFFF', '#FF0000', '#333333'];

      let frame = 0;
      const maxFrames = 40;

      const draw = () => {
        if (frame >= maxFrames) {
          canvas.style.opacity = '0';
          resolve();
          return;
        }

        const progress = frame / maxFrames;

        // Noise peaks then starts easing in the last 30%
        let noiseOpacity;
        if (progress < 0.7) {
          noiseOpacity = 0.6 + (progress / 0.7) * 0.35;
        } else {
          // Ease down from 0.95 toward 0.7
          const fadeProgress = (progress - 0.7) / 0.3;
          noiseOpacity = 0.95 - fadeProgress * 0.25;
        }
        this.drawNoise(noiseOpacity);

        ctx.fillStyle = `rgba(0, 0, 0, ${0.06 + progress * 0.12})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Glitch bars — fade out in last 30%
        const barFade = progress > 0.7 ? 1 - ((progress - 0.7) / 0.3) : 1;
        const barCount = Math.floor((3 + progress * 10) * barFade);
        for (let i = 0; i < barCount; i++) {
          const y = Math.random() * canvas.height;
          const h = 1 + Math.random() * (4 + progress * 12);
          const offset = (Math.random() - 0.5) * 60 * progress;
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.globalAlpha = (0.1 + Math.random() * 0.4) * barFade;
          ctx.fillRect(offset, y, canvas.width, h);
        }
        ctx.globalAlpha = 1;

        // Characters — also fade in last 30%
        const charCount = Math.floor((15 + progress * 80) * barFade);
        for (let i = 0; i < charCount; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const char = chars[Math.floor(Math.random() * chars.length)];
          const color = colors[Math.floor(Math.random() * colors.length)];

          ctx.fillStyle = color;
          ctx.globalAlpha = (0.2 + Math.random() * 0.8) * barFade;
          ctx.font = `${10 + Math.random() * 22}px monospace`;
          ctx.fillText(char, x, y);
        }
        ctx.globalAlpha = 1;

        frame++;
        requestAnimationFrame(draw);
      };

      draw();
    });
  },

  async noiseFadeOut() {
    // Gradually dissolve the snow noise from ~0.7 down to 0
    return new Promise(resolve => {
      let frame = 0;
      const maxFrames = 45; // ~0.75s at 60fps — slow, gentle fade

      const fade = () => {
        if (frame >= maxFrames) {
          if (this.noiseCanvas) this.noiseCanvas.style.opacity = '0';
          resolve();
          return;
        }

        const progress = frame / maxFrames;
        // Ease-out curve: fast at start, slow at end
        const eased = 1 - Math.pow(1 - progress, 2.5);
        const noiseOpacity = 0.7 * (1 - eased);

        this.drawNoise(noiseOpacity);

        frame++;
        requestAnimationFrame(fade);
      };

      fade();
    });
  },

  async revealDesktop() {
    return new Promise(resolve => {
      this.unlockLayer.style.transition = 'opacity 1s ease-out';
      this.unlockLayer.style.opacity = '0';

      setTimeout(() => {
        if (window.WorkspaceCore && window.WorkspaceCore.showLayer) {
          WorkspaceCore.showLayer('desktop');
          WorkspaceCore.state.isLocked = false;
        }

        // Clean up
        this.unlockLayer.querySelectorAll('.fragment-char').forEach(el => el.remove());

        // Reset lock screen
        this.unlockLayer.style.opacity = '1';
        this.unlockLayer.style.transition = '';
        this.passwordInput.value = '';
        this.passwordInput.disabled = false;
        this.submitBtn.disabled = false;
        this.usernameEl.disabled = false;
        this.isUnlocking = false;

        if (this.lockScreen) {
          for (const el of this.lockScreen.children) {
            el.style.transform = '';
            el.style.opacity = '';
            el.style.textShadow = '';
            el.style.filter = '';
            el.style.position = '';
          }
        }
        if (this.usernameZalgo) {
          this.usernameZalgo.style.transform = '';
        }

        this.startZalgoUsername();
        resolve();
      }, 1100);
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
