// ═══════════════════════════════════════════
//  Desktop Pet — sprite-based, adapted from
//  -Miori9-.github.io original pet system
// ═══════════════════════════════════════════

const PetSystem = (() => {
  const SPRITE_BASE = 'assets/images/pet/';

  const CONFIG = {
    frameRate: 150,
    walkSpeed: 2.5,
    idleTimeMin: 3500,
    idleTimeMax: 8000,
    speechDuration: 3000,
    sleepLoopDuration: 15000,
    cryLoopDuration: 10000,
    chargeSpeed: 5,
    chaseSpeed: 3.75,
    chargeChance: 0.3,
    windowDetectRange: 200,
    handArriveRange: 30,
    handTrackInterval: 100,
    movementInterval: 30,
    petSize: 150,
  };

  const ANIMATIONS = {
    default:   ['default.png'],
    catch:     ['catch1.png', 'catch-left.png', 'catch-right.png'],
    cry:       ['cry-1.png', 'cry-2.png', 'cry-3.png', 'cry-4.png'],
    sleep:     ['sleep1.png', 'sleep2.png', 'sleep3.png', 'sleep4.png', 'sleep5.png', 'sleep6.png'],
    walk:      ['walk1.png', 'walk2.png', 'walk3.png', 'walk4.png'],
    walkRight: ['walk-right1.png', 'walk-right2.png', 'walk-right3.png', 'walk-right4.png'],
  };

  const SPEECHES = [
    '早上好！', '你是我的妈妈',
    'm҈̧̳͍̆̌̒͂̄͝ͅǒ̶̢̤̮̽̈̄͝m̷̧̩͙͖͔͗͊̏̓͡ î̷̗̩̲͔̤̇̑̕͜ l̴̨̮̮̔̐̕o҉̢̘̰̜͕̏͛̒͞v҉̛̘̬̅͒͊͢e҉̡͙̟͔̙̮҇̀́̎͑ y̶̖̫͕̌̋͢͝o҉̢̩̘̇͆͋́̚͞u҉̤̩҇͛̑͑̇̀͜',
  ];

  // Preload all frames
  const _allFrames = Object.values(ANIMATIONS).flat();
  _allFrames.forEach(src => { const img = new Image(); img.src = SPRITE_BASE + src; });

  // ── Hand Object ──
  class HandObject {
    constructor() {
      this.element = null;
      this.x = window.innerWidth / 2;
      this.y = window.innerHeight / 2;
      this.isDragging = false;
      this.isPlaced = false;
      this._boundMouseMove = null;
      this._boundMouseUp = null;
      this._boundTouchMove = null;
      this._boundTouchEnd = null;
      this._init();
    }

    _init() {
      this.element = document.createElement('img');
      this.element.src = SPRITE_BASE + 'hand.png';
      this.element.style.cssText = `
        position: fixed; height: 90px; width: auto;
        cursor: grab; opacity: 0.6; z-index: 10000;
        pointer-events: auto; user-select: none;
        -webkit-user-drag: none;
      `;
      document.body.appendChild(this.element);
      this._updatePosition();

      this.isDragging = true;
      this.element.style.cursor = 'grabbing';

      this._boundMouseMove = e => this._onMouseMove(e);
      this._boundMouseUp = () => this._endDrag();
      this._boundTouchMove = e => this._onTouchMove(e);
      this._boundTouchEnd = () => this._endDrag();

      this.element.addEventListener('mousedown', e => {
        if (!this.isPlaced) return;
        e.preventDefault();
        this.isDragging = true;
        this.element.style.cursor = 'grabbing';
        this.element.style.opacity = '0.6';
      });
      this.element.addEventListener('touchstart', e => {
        if (!this.isPlaced) return;
        e.preventDefault();
        this.isDragging = true;
        this.element.style.opacity = '0.6';
      }, { passive: false });

      document.addEventListener('mousemove', this._boundMouseMove);
      document.addEventListener('mouseup', this._boundMouseUp);
      document.addEventListener('touchmove', this._boundTouchMove, { passive: false });
      document.addEventListener('touchend', this._boundTouchEnd);
    }

    _onMouseMove(e) {
      if (!this.isDragging) return;
      const rect = this.element.getBoundingClientRect();
      this._moveTo(e.clientX - rect.width / 2, e.clientY - rect.height / 2);
    }

    _onTouchMove(e) {
      if (!this.isDragging) return;
      e.preventDefault();
      const t = e.touches[0];
      const rect = this.element.getBoundingClientRect();
      this._moveTo(t.clientX - rect.width / 2, t.clientY - rect.height / 2);
    }

    _moveTo(x, y) {
      const rect = this.element.getBoundingClientRect();
      this.x = Math.max(0, Math.min(x, window.innerWidth - rect.width));
      this.y = Math.max(0, Math.min(y, window.innerHeight - rect.height));
      this._updatePosition();
      if (this.isPlaced) {
        pets.forEach(p => { p.handArrived = false; });
      }
    }

    _updatePosition() {
      this.element.style.left = this.x + 'px';
      this.element.style.top = this.y + 'px';
    }

    _endDrag() {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.isPlaced = true;
      this.element.style.cursor = 'grab';
      this.element.style.opacity = '1.0';
      pets.forEach(p => p._startHandTracking());
    }

    remove() {
      pets.forEach(p => {
        if (p.handTrackingTimer) {
          clearInterval(p.handTrackingTimer);
          p.handTrackingTimer = null;
        }
        p.isChasing = false;
        p.handArrived = false;
      });
      document.removeEventListener('mousemove', this._boundMouseMove);
      document.removeEventListener('mouseup', this._boundMouseUp);
      document.removeEventListener('touchmove', this._boundTouchMove);
      document.removeEventListener('touchend', this._boundTouchEnd);
      this.element.remove();
      motherHand = null;
    }
  }

  // ── Desktop Pet ──
  class DesktopPet {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.currentAnimation = 'default';
      this.animationTimer = null;
      this.animationTimeout = null;
      this.behaviorTimer = null;
      this.loopEndTimer = null;
      this.walkInterval = null;
      this.isDragging = false;
      this.isWalking = false;
      this.handTrackingTimer = null;
      this.isChasing = false;
      this.handArrived = false;
      this.loopEndAt = null;
      this._lastTap = 0;
      this._buildDOM();
      this._setupDrag();
      this._setupTouch();
      this.updatePosition();

      // Drop bounce
      this.container.classList.add('dropping');
      this.container.addEventListener('animationend', () => {
        this.container.classList.remove('dropping');
      }, { once: true });

      this.setImage('default.png');
      this.scheduleBehavior();

      if (motherHand && motherHand.isPlaced) {
        this._startHandTracking();
      }
    }

    _buildDOM() {
      this.container = document.createElement('div');
      this.container.className = 'pet-container';

      this.bubbleEl = document.createElement('div');
      this.bubbleEl.className = 'speech-bubble';
      this.speechTextEl = document.createElement('div');
      this.speechTextEl.className = 'speech-text';
      this.bubbleEl.appendChild(this.speechTextEl);

      this.imageEl = document.createElement('img');
      this.imageEl.className = 'pet-image';
      this.imageEl.alt = 'Pet';

      this.container.append(this.bubbleEl, this.imageEl);
      document.body.appendChild(this.container);
    }

    setImage(src) { this.imageEl.src = SPRITE_BASE + src; }

    clearAll() {
      clearInterval(this.animationTimer);  this.animationTimer = null;
      clearTimeout(this.animationTimeout); this.animationTimeout = null;
      clearTimeout(this.behaviorTimer);    this.behaviorTimer = null;
      clearTimeout(this.loopEndTimer);     this.loopEndTimer = null;
      clearInterval(this.walkInterval);    this.walkInterval = null;
      this.isWalking = false;
      this.loopEndAt = null;
    }

    returnToIdle() {
      this.clearAll();
      this.currentAnimation = 'default';
      this.setImage('default.png');
      this.scheduleBehavior();
    }

    playLoop(frames, interval) {
      clearInterval(this.animationTimer);
      let i = 0;
      this.setImage(frames[i]);
      this.animationTimer = setInterval(() => {
        i = (i + 1) % frames.length;
        this.setImage(frames[i]);
      }, interval);
    }

    playSequence(frames, interval, onDone) {
      clearTimeout(this.animationTimeout);
      let i = 0;
      const next = () => {
        this.setImage(frames[i]);
        i++;
        if (i < frames.length) this.animationTimeout = setTimeout(next, interval);
        else if (onDone) onDone();
      };
      next();
    }

    scheduleBehavior() {
      clearTimeout(this.behaviorTimer);
      const d = CONFIG.idleTimeMin + Math.random() * (CONFIG.idleTimeMax - CONFIG.idleTimeMin);
      this.behaviorTimer = setTimeout(() => this.randomBehavior(), d);
    }

    checkStuck() {
      if (this.loopEndAt && Date.now() >= this.loopEndAt) {
        this.returnToIdle();
      }
    }

    randomBehavior() {
      const r = Math.random();
      if (r < 0.6)      this.walkFree();
      else if (r < 0.8) this.sleep();
      else              this.cry();
    }

    // ── Movement ──
    walkFree() {
      const nearWindow = this._detectNearbyWindow();
      if (nearWindow && Math.random() < CONFIG.chargeChance) {
        this._chargeWindow(nearWindow);
        return;
      }

      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 250;
      let tx = this.x + Math.cos(angle) * dist;
      let ty = this.y + Math.sin(angle) * dist;
      tx = Math.max(0, Math.min(tx, window.innerWidth - CONFIG.petSize));
      ty = Math.max(0, Math.min(ty, window.innerHeight - CONFIG.petSize));
      this._walkTo(tx, ty);
    }

    _walkTo(tx, ty) {
      const dx = tx - this.x, dy = ty - this.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 5) { this.scheduleBehavior(); return; }
      const nx = dx / len, ny = dy / len;

      const anim = nx >= 0 ? 'walkRight' : 'walk';
      this.isWalking = true;
      this.currentAnimation = anim;
      this.playLoop(ANIMATIONS[anim], CONFIG.frameRate);

      clearInterval(this.walkInterval);
      this.walkInterval = setInterval(() => {
        if (!this.isWalking) { clearInterval(this.walkInterval); return; }
        const rdx = tx - this.x, rdy = ty - this.y;
        const rem = Math.sqrt(rdx * rdx + rdy * rdy);
        if (rem < CONFIG.walkSpeed) {
          this.x = tx; this.y = ty;
          clearInterval(this.walkInterval);
          this.returnToIdle();
        } else {
          this.x += nx * CONFIG.walkSpeed;
          this.y += ny * CONFIG.walkSpeed;
          this.updatePosition();
        }
      }, CONFIG.movementInterval);
    }

    sleep() {
      this.clearAll();
      this.currentAnimation = 'sleep';
      this.playSequence(ANIMATIONS.sleep, 833, () => {
        this.playLoop(['sleep4.png', 'sleep5.png', 'sleep6.png'], 500);
        this.loopEndAt = Date.now() + CONFIG.sleepLoopDuration;
        this.loopEndTimer = setTimeout(() => this.returnToIdle(), CONFIG.sleepLoopDuration);
      });
    }

    cry() {
      this.clearAll();
      this.currentAnimation = 'cry';
      this.playSequence(ANIMATIONS.cry, 1250, () => {
        this.playLoop(['cry-3.png', 'cry-4.png'], 600);
        this.loopEndAt = Date.now() + CONFIG.cryLoopDuration;
        this.loopEndTimer = setTimeout(() => this.returnToIdle(), CONFIG.cryLoopDuration);
      });
    }

    // ── Window Interaction ──
    _detectNearbyWindow() {
      if (!window.WindowManager) return null;
      const wins = Object.values(WindowManager.windows).filter(w => !w.closed && !w.minimized);
      let nearest = null, minDist = CONFIG.windowDetectRange;

      for (const win of wins) {
        const r = win.el.getBoundingClientRect();
        const wx = r.left + r.width / 2;
        const wy = r.top + r.height / 2;
        const dx = wx - (this.x + CONFIG.petSize / 2);
        const dy = wy - (this.y + CONFIG.petSize / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) { minDist = dist; nearest = win; }
      }
      return nearest;
    }

    _chargeWindow(win) {
      if (!win || this.isDragging) return;
      if (this.currentAnimation === 'sleep' || this.currentAnimation === 'cry') return;

      clearTimeout(this.behaviorTimer);
      clearInterval(this.walkInterval);

      const r = win.el.getBoundingClientRect();
      const tx = r.left + r.width / 2 - CONFIG.petSize / 2;
      const ty = r.top + r.height / 2 - CONFIG.petSize / 2;
      const dx = tx - this.x, dy = ty - this.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len < 5) {
        this._interactWithWindow(win, dx / Math.max(len, 0.01), dy / Math.max(len, 0.01));
        return;
      }

      const nx = dx / len, ny = dy / len;

      this.speak('！');
      setTimeout(() => {
        const anim = nx >= 0 ? 'walkRight' : 'walk';
        this.isWalking = true;
        this.currentAnimation = anim;
        this.playLoop(ANIMATIONS[anim], CONFIG.frameRate);

        clearInterval(this.walkInterval);
        this.walkInterval = setInterval(() => {
          if (!this.isWalking) { clearInterval(this.walkInterval); return; }
          const rdx = tx - this.x, rdy = ty - this.y;
          const rem = Math.sqrt(rdx * rdx + rdy * rdy);
          if (rem < CONFIG.chargeSpeed) {
            this.x = tx; this.y = ty;
            clearInterval(this.walkInterval);
            this.isWalking = false;
            this._interactWithWindow(win, nx, ny);
            this.returnToIdle();
          } else {
            this.x += nx * CONFIG.chargeSpeed;
            this.y += ny * CONFIG.chargeSpeed;
            this.updatePosition();
          }
        }, CONFIG.movementInterval);
      }, 500);
    }

    _interactWithWindow(win, dirX, dirY) {
      if (Math.random() < 0.5) {
        // Push window
        const angle = Math.random() * Math.PI * 2;
        const pushDist = 60 + Math.random() * 100;
        const ndx = Math.cos(angle) * pushDist;
        const ndy = Math.sin(angle) * pushDist;

        // Animate the window nudge
        const el = win.el;
        const curX = parseInt(el.style.left) || 0;
        const curY = parseInt(el.style.top) || 0;
        const newX = Math.max(0, Math.min(curX + ndx, window.innerWidth - el.offsetWidth));
        const newY = Math.max(0, Math.min(curY + ndy, window.innerHeight - el.offsetHeight));
        el.style.transition = 'left 0.3s ease, top 0.3s ease';
        el.style.left = newX + 'px';
        el.style.top = newY + 'px';
        setTimeout(() => { el.style.transition = ''; }, 350);
      } else {
        // Bounce back and cry
        const bounceDistance = 50 + Math.random() * 30;
        this.x -= dirX * bounceDistance;
        this.y -= dirY * bounceDistance;
        this.updatePosition();
        this.cry();
      }
    }

    // ── Hand Tracking ──
    _startHandTracking() {
      if (this.handTrackingTimer) return;

      this.handTrackingTimer = setInterval(() => {
        if (!motherHand || !motherHand.isPlaced) {
          if (this.isChasing || this.handArrived) {
            this.isChasing = false;
            this.handArrived = false;
            this._stopHandTracking();
            if (!this.isDragging && this.currentAnimation !== 'sleep' && this.currentAnimation !== 'cry') {
              this.scheduleBehavior();
            }
          }
          return;
        }

        if (this.currentAnimation === 'sleep' || this.currentAnimation === 'cry') return;

        const dx = motherHand.x - this.x;
        const dy = motherHand.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < CONFIG.handArriveRange) {
          if (!this.handArrived) {
            this.handArrived = true;
            this.isChasing = false;
            clearInterval(this.walkInterval);
            clearTimeout(this.behaviorTimer);
            this.returnToIdle();
          }
        } else if (!this.isChasing) {
          this._chaseHand();
        }
      }, CONFIG.handTrackInterval);
    }

    _stopHandTracking() {
      if (this.handTrackingTimer) {
        clearInterval(this.handTrackingTimer);
        this.handTrackingTimer = null;
      }
    }

    _chaseHand() {
      if (!motherHand || !motherHand.isPlaced || this.isDragging) return;
      if (this.currentAnimation === 'sleep' || this.currentAnimation === 'cry') return;

      this.isChasing = true;
      this.handArrived = false;
      clearTimeout(this.behaviorTimer);
      clearInterval(this.walkInterval);

      const tx = motherHand.x, ty = motherHand.y;
      const dx = tx - this.x, dy = ty - this.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len < CONFIG.handArriveRange) {
        this.handArrived = true;
        this.isChasing = false;
        return;
      }

      const anim = (dx / len) >= 0 ? 'walkRight' : 'walk';
      this.currentAnimation = anim;
      this.playLoop(ANIMATIONS[anim], CONFIG.frameRate);

      clearInterval(this.walkInterval);
      this.walkInterval = setInterval(() => {
        if (!this.isChasing) { clearInterval(this.walkInterval); return; }
        if (!motherHand || !motherHand.isPlaced) {
          this.isChasing = false;
          clearInterval(this.walkInterval);
          this.returnToIdle();
          return;
        }

        const rdx = motherHand.x - this.x;
        const rdy = motherHand.y - this.y;
        const rem = Math.sqrt(rdx * rdx + rdy * rdy);

        if (rem < CONFIG.chaseSpeed) {
          this.x = motherHand.x;
          this.y = motherHand.y;
          this.handArrived = true;
          this.isChasing = false;
          clearInterval(this.walkInterval);
          this.returnToIdle();
        } else {
          const rnx = rdx / rem, rny = rdy / rem;
          const newAnim = rnx >= 0 ? 'walkRight' : 'walk';
          if (newAnim !== this.currentAnimation) {
            this.currentAnimation = newAnim;
            this.playLoop(ANIMATIONS[newAnim], CONFIG.frameRate);
          }
          this.x += rnx * CONFIG.chaseSpeed;
          this.y += rny * CONFIG.chaseSpeed;
          this.updatePosition();
        }
      }, CONFIG.movementInterval);
    }

    // ── Drag (mouse) ──
    _setupDrag() {
      let sx, sy, ix, iy, mouseMoved = false;

      this.container.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        mouseMoved = false;
        sx = e.clientX; sy = e.clientY; ix = this.x; iy = this.y;
        e.preventDefault();
      });

      document.addEventListener('mousemove', e => {
        if (sx === undefined) return;
        const moved = Math.abs(e.clientX - sx) > 5 || Math.abs(e.clientY - sy) > 5;
        if (moved && !this.isDragging) {
          this.isDragging = true;
          mouseMoved = true;
          this.clearAll();
          this.isChasing = false;
          this.handArrived = false;
          this.currentAnimation = 'catch';
          this.playLoop(ANIMATIONS.catch, CONFIG.frameRate);
          this.container.classList.add('dragging');
        }
        if (this.isDragging) {
          this.x = ix + e.clientX - sx;
          this.y = iy + e.clientY - sy;
          this.updatePosition();
        }
      });

      document.addEventListener('mouseup', () => {
        if (this.isDragging) {
          this.isDragging = false;
          this.container.classList.remove('dragging');
          this.returnToIdle();
        }
        sx = undefined;
      });

      this.container.addEventListener('click', () => {
        if (mouseMoved) { mouseMoved = false; return; }
        if (this.currentAnimation === 'sleep' || this.currentAnimation === 'cry') {
          this.returnToIdle();
        } else {
          this.cry();
        }
      });

      this.container.addEventListener('dblclick', () => this.speak());
    }

    // ── Touch ──
    _setupTouch() {
      let startX, startY, startIX, startIY, moved = false;

      this.container.addEventListener('touchstart', e => {
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY;
        startIX = this.x; startIY = this.y;
        moved = false;
        e.preventDefault();
      }, { passive: false });

      this.container.addEventListener('touchmove', e => {
        const t = e.touches[0];
        if (!moved && (Math.abs(t.clientX - startX) > 8 || Math.abs(t.clientY - startY) > 8)) {
          moved = true;
          this.isDragging = true;
          this.clearAll();
          this.isChasing = false;
          this.handArrived = false;
          this.currentAnimation = 'catch';
          this.playLoop(ANIMATIONS.catch, CONFIG.frameRate);
          this.container.classList.add('dragging');
        }
        if (this.isDragging) {
          this.x = startIX + (t.clientX - startX);
          this.y = startIY + (t.clientY - startY);
          this.updatePosition();
        }
        e.preventDefault();
      }, { passive: false });

      this.container.addEventListener('touchend', e => {
        if (this.isDragging) {
          this.isDragging = false;
          this.container.classList.remove('dragging');
          this.returnToIdle();
        } else if (!moved) {
          if (this.currentAnimation === 'sleep' || this.currentAnimation === 'cry') {
            this.returnToIdle();
          } else {
            this.cry();
          }
          if (this._lastTap && Date.now() - this._lastTap < 400) {
            this.speak();
          }
          this._lastTap = Date.now();
        }
        moved = false;
        e.preventDefault();
      }, { passive: false });
    }

    updatePosition() {
      this.x = Math.max(0, Math.min(this.x, window.innerWidth - CONFIG.petSize));
      this.y = Math.max(0, Math.min(this.y, window.innerHeight - CONFIG.petSize));
      this.container.style.left = this.x + 'px';
      this.container.style.top = this.y + 'px';
    }

    speak(text) {
      const t = text || SPEECHES[Math.floor(Math.random() * SPEECHES.length)];
      this.speechTextEl.textContent = t;
      this.bubbleEl.classList.add('show');
      setTimeout(() => this.bubbleEl.classList.remove('show'), CONFIG.speechDuration);
    }

    destroy() {
      this.clearAll();
      this._stopHandTracking();
      this.container.remove();
    }
  }

  // ── State ──
  const pets = [];
  let motherHand = null;
  let initialized = false;

  // ── URL → Window ──
  // Clipboard listener: paste a URL to open a web window
  function handlePaste(e) {
    const text = (e.clipboardData || window.clipboardData).getData('text').trim();
    if (!text) return;

    // Check if it looks like a URL
    if (!/^https?:\/\//i.test(text) && !/^[a-z0-9-]+\.[a-z]{2,}/i.test(text)) return;

    let url = text.startsWith('http') ? text : 'https://' + text;

    // YouTube → embed
    const ytM = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytM) {
      _openWebWindow(`https://www.youtube.com/embed/${ytM[1]}?autoplay=1`, 'YouTube');
      return;
    }
    // Bilibili BV
    const bvM = url.match(/bilibili\.com\/video\/(BV[A-Za-z0-9]+)/);
    if (bvM) {
      _openWebWindow(`https://player.bilibili.com/player.html?bvid=${bvM[1]}&autoplay=1`, 'Bilibili');
      return;
    }
    // Bilibili AV
    const avM = url.match(/bilibili\.com\/video\/av(\d+)/);
    if (avM) {
      _openWebWindow(`https://player.bilibili.com/player.html?aid=${avM[1]}&autoplay=1`, 'Bilibili');
      return;
    }

    // Other URL — show unsupported message in window
    let hostname = url;
    try { hostname = new URL(url).hostname; } catch(e) {}
    _openWebWindow(null, hostname, url);
  }

  function _openWebWindow(embedUrl, label, originalUrl) {
    if (!window.WindowManager) return;

    const content = document.createElement('div');
    content.style.cssText = 'width:100%;height:100%;position:relative;';

    if (embedUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.style.cssText = 'width:100%;height:100%;border:none;';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      content.appendChild(iframe);
    } else {
      content.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#888;gap:8px;font-size:13px;">
          <div style="font-size:32px">🚫</div>
          <div style="text-align:center;line-height:1.8">
            <b>${label}</b> 不支持嵌入显示<br>
            <span style="font-size:11px;color:#666">该网站禁止在窗口内打开</span>
          </div>
          <div style="font-size:11px;color:#555;margin-top:4px">✅ 支持：YouTube、Bilibili</div>
        </div>
      `;
    }

    WindowManager.create('web-' + Date.now(), label, content, {
      width: 480, height: 320,
      x: 80 + Math.random() * (window.innerWidth - 560),
      y: 60 + Math.random() * (window.innerHeight - 380),
    });
  }

  // ── Public API ──
  return {
    pets,

    init() {
      if (initialized) return;
      initialized = true;

      // Spawn first pet
      const startX = window.innerWidth / 2 - CONFIG.petSize / 2;
      const startY = window.innerHeight - 200;
      pets.push(new DesktopPet(startX, startY));

      // Periodic speech
      setInterval(() => {
        pets.forEach(p => { if (Math.random() < 0.15) p.speak(); });
      }, 20000);

      // Unstick on visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          pets.forEach(p => p.checkStuck());
        }
      });

      // URL paste listener
      document.addEventListener('paste', handlePaste);
    },

    summonHand() {
      if (motherHand) {
        motherHand.remove();
        motherHand = null;
        return false; // hand removed
      }
      motherHand = new HandObject();
      return true; // hand summoned
    },

    hasHand() {
      return !!motherHand;
    },

    spawnPet() {
      if (pets.length >= 20) return false;
      const x = Math.random() * (window.innerWidth - CONFIG.petSize);
      pets.push(new DesktopPet(x, -10));
      return true;
    },

    getPetCount() {
      return pets.length;
    },
  };
})();

// Init when desktop shows
const petInitObserver = new MutationObserver(() => {
  const desktop = document.getElementById('desktop-layer');
  if (desktop && !desktop.classList.contains('hidden')) {
    PetSystem.init();
    petInitObserver.disconnect();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.getElementById('desktop-layer');
    if (desktop) petInitObserver.observe(desktop, { attributes: true, attributeFilter: ['class'] });
  });
} else {
  const desktop = document.getElementById('desktop-layer');
  if (desktop) {
    if (!desktop.classList.contains('hidden')) {
      PetSystem.init();
    } else {
      petInitObserver.observe(desktop, { attributes: true, attributeFilter: ['class'] });
    }
  }
}

window.PetSystem = PetSystem;
