// Keep the launch/indicator API used by WindowManager and the pet system.
const DockSystem = {
  bar: null,
  items: [],
  positions: {},
  apps: [
    { id: 'todo', label: 'Todo List', kind: 'PLANNER', position: [0.10, 0.08] },
    { id: 'calendar', label: '日历', kind: 'CALENDAR', position: [0.64, 0.01] },
    { id: 'pomodoro', label: '番茄钟', kind: 'FOCUS', position: [0.40, 0.29] },
    { id: 'hiiragi', label: '柊野', kind: 'FRAGMENTS', position: [0.88, 0.35] },
    { id: 'pet-spawn', label: '召唤完能', kind: 'SOMEONE IS HERE', position: [0.02, 0.51] },
    { id: 'oc-gallery', label: 'OC Gallery', kind: 'THE OTHER SIDE', position: [0.54, 0.70] },
    { id: 'pet-hand', label: '妈妈的手', kind: 'COMPANION', position: [0.19, 0.93] },
    { id: 'settings', label: '设置', kind: 'PREFERENCES', position: [0.88, 0.96] },
  ],

  init() {
    const dock = document.getElementById('dock');
    if (!dock || this.bar) return;
    this.bar = document.createElement('div');
    this.bar.id = 'dock-bar';
    this.bar.className = 'desktop-files';
    this.readPositions();
    this.apps.forEach((app, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'desktop-file dock-item';
      item.dataset.app = app.id;
      item.setAttribute('aria-label', app.label);
      item.innerHTML = `<span class="file-icon dock-icon" aria-hidden="true"><span class="folder-symbol"></span><span class="file-number">${String(index + 1).padStart(2, '0')}</span></span><span class="file-label">${app.label}</span><span class="file-kind">${app.kind}</span><span class="dock-indicator" aria-hidden="true"></span>`;
      let drag = null;
      let suppressClick = false;
      item.addEventListener('pointerdown', event => {
        suppressClick = false;
        if (event.button !== 0 || !event.isPrimary || window.matchMedia('(max-width: 900px), (max-height: 580px)').matches) return;
        drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
          left: parseFloat(item.style.left) || 0, top: parseFloat(item.style.top) || 0, moved: false };
        item.setPointerCapture(event.pointerId);
      });
      item.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 8) return;
        drag.moved = true;
        suppressClick = true;
        item.classList.add('dragging');
        const bounds = this.bounds(item);
        item.style.left = `${Math.max(0, Math.min(bounds.x, drag.left + dx))}px`;
        item.style.top = `${Math.max(0, Math.min(bounds.y, drag.top + dy))}px`;
      });
      const finishDrag = event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        if (drag.moved) {
          const bounds = this.bounds(item);
          this.positions[app.id] = [bounds.x ? parseFloat(item.style.left) / bounds.x : 0,
            bounds.y ? parseFloat(item.style.top) / bounds.y : 0];
          try { localStorage.setItem('dreamcore-desktop-positions', JSON.stringify(this.positions)); } catch { /* Private browsing: positions last this visit. */ }
        }
        if (event.type === 'pointercancel') suppressClick = true;
        drag = null;
        item.classList.remove('dragging');
        if (item.hasPointerCapture(event.pointerId)) item.releasePointerCapture(event.pointerId);
      };
      item.addEventListener('pointerup', finishDrag);
      item.addEventListener('pointercancel', finishDrag);
      item.addEventListener('lostpointercapture', finishDrag);
      item.addEventListener('click', event => {
        if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
        this.launchApp(app.id);
      });
      this.bar.appendChild(item);
      this.items.push({ el: item, app });
    });
    dock.appendChild(this.bar);
    this.layout();
    window.addEventListener('resize', () => this.layout());
    // The desktop initially has display:none, so measure again when it unlocks.
    new MutationObserver(() => this.layout()).observe(document.getElementById('desktop-layer'), { attributes: true, attributeFilter: ['class'] });
    document.getElementById('desktop-reset')?.addEventListener('click', () => {
      this.positions = {};
      try { localStorage.removeItem('dreamcore-desktop-positions'); } catch { /* Optional persistence. */ }
      this.layout();
    });
    const updateClock = () => {
      const clock = document.getElementById('desktop-clock');
      if (!clock) return;
      const now = new Date();
      clock.dateTime = now.toISOString();
      clock.textContent = now.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    };
    updateClock();
    setInterval(updateClock, 30000);
  },

  readPositions() {
    try {
      const saved = JSON.parse(localStorage.getItem('dreamcore-desktop-positions'));
      if (!saved || typeof saved !== 'object') return;
      this.apps.forEach(app => {
        const point = saved[app.id];
        if (Array.isArray(point) && point.length === 2 && point.every(n => Number.isFinite(n) && n >= 0 && n <= 1)) {
          this.positions[app.id] = point;
        }
      });
    } catch { /* Ignore unavailable or damaged storage. */ }
  },

  bounds(item) {
    return { x: Math.max(0, this.bar.clientWidth - item.offsetWidth), y: Math.max(0, this.bar.clientHeight - item.offsetHeight) };
  },

  layout() {
    if (!this.bar?.clientWidth) return;
    this.items.forEach(({ el, app }) => {
      const point = this.positions[app.id] || app.position;
      const bounds = this.bounds(el);
      el.style.left = `${point[0] * bounds.x}px`;
      el.style.top = `${point[1] * bounds.y}px`;
    });
  },

  launchApp(appId) {
    if (appId === 'pet-spawn' && window.PetSystem) {
      PetSystem.spawnPet();
      return;
    }
    if (appId === 'pet-hand' && window.PetSystem) {
      const summoned = PetSystem.summonHand();
      const item = this.items.find(i => i.app.id === appId)?.el;
      item?.classList.toggle('active', summoned);
      item?.setAttribute('aria-pressed', String(summoned));
      return;
    }
    if (appId === 'oc-gallery' && window.HorrorMode) HorrorMode.toggle();
    if (!window.Apps?.[appId]) return;
    const existing = window.WindowManager?.findByApp(appId);
    if (existing) {
      if (existing.minimized) WindowManager.restore(existing.id);
      else WindowManager.focus(existing.id);
      return;
    }
    Apps[appId].launch();
  },

  updateIndicator(appId, active) {
    this.items.find(i => i.app.id === appId)?.el.classList.toggle('active', active);
  },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => DockSystem.init());
else DockSystem.init();
window.DockSystem = DockSystem;
