const WindowManager = {
  windows: {},
  nextId: 1,
  topZ: 100,
  container: null,
  dragState: null,
  resizeState: null,

  init() {
    this.container = document.getElementById('windows-container');
    if (!this.container) return;

    // Global mouse handlers for drag/resize
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleMouseUp.bind(this));
  },

  create(appId, title, contentEl, options = {}) {
    // If window already exists for this app, focus it
    const existing = Object.values(this.windows).find(w => w.appId === appId && !w.closed);
    if (existing) {
      if (existing.minimized) {
        this.restore(existing.id);
      }
      this.focus(existing.id);
      return existing.id;
    }

    const id = this.nextId++;
    const w = options.width || 400;
    const h = options.height || 480;
    const x = options.x ?? Math.max(40, 80 + (id % 5) * 30);
    const y = options.y ?? Math.max(40, 60 + (id % 5) * 30);

    // Build DOM
    const win = document.createElement('div');
    win.className = 'window focused';
    win.dataset.windowId = id;
    win.dataset.app = appId;
    win.style.left = x + 'px';
    win.style.top = y + 'px';
    win.style.width = w + 'px';
    win.style.height = h + 'px';
    win.style.zIndex = ++this.topZ;

    win.innerHTML = `
      <div class="window-titlebar">
        <div class="window-controls">
          <button class="window-btn close" title="Close"></button>
          <button class="window-btn minimize" title="Minimize"></button>
        </div>
        <span class="window-title">${title}</span>
      </div>
      <div class="window-body"></div>
      <div class="window-resize-handle"></div>
    `;

    // Insert app content
    const body = win.querySelector('.window-body');
    if (typeof contentEl === 'string') {
      body.innerHTML = contentEl;
    } else if (contentEl instanceof HTMLElement) {
      body.appendChild(contentEl);
    }

    // Event: focus on click
    win.addEventListener('mousedown', () => this.focus(id));
    win.addEventListener('touchstart', () => this.focus(id));

    // Event: drag by titlebar
    const titlebar = win.querySelector('.window-titlebar');
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.window-btn')) return;
      this.startDrag(id, e.clientX, e.clientY);
    });
    titlebar.addEventListener('touchstart', (e) => {
      if (e.target.closest('.window-btn')) return;
      const t = e.touches[0];
      this.startDrag(id, t.clientX, t.clientY);
    }, { passive: true });

    // Event: resize
    const handle = win.querySelector('.window-resize-handle');
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.startResize(id, e.clientX, e.clientY);
    });
    handle.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this.startResize(id, t.clientX, t.clientY);
    }, { passive: true });

    // Event: close / minimize
    win.querySelector('.window-btn.close').addEventListener('click', () => this.close(id));
    win.querySelector('.window-btn.minimize').addEventListener('click', () => this.minimize(id));

    this.container.appendChild(win);

    // Unfocus all others
    this.unfocusAll();
    win.classList.add('focused');

    this.windows[id] = {
      id,
      appId,
      el: win,
      minimized: false,
      closed: false,
    };

    // Notify dock
    if (window.DockSystem) DockSystem.updateIndicator(appId, true);

    return id;
  },

  focus(id) {
    const win = this.windows[id];
    if (!win || win.closed) return;

    this.unfocusAll();
    win.el.classList.add('focused');
    win.el.style.zIndex = ++this.topZ;

    // Reset z if it gets too high
    if (this.topZ > 900) this.restack();
  },

  unfocusAll() {
    Object.values(this.windows).forEach(w => {
      if (!w.closed) w.el.classList.remove('focused');
    });
  },

  close(id) {
    const win = this.windows[id];
    if (!win || win.closed) return;

    win.closed = true;
    win.el.remove();

    // Notify dock
    if (window.DockSystem) DockSystem.updateIndicator(win.appId, false);

    // Notify app
    if (window.Apps && Apps[win.appId] && Apps[win.appId].onClose) {
      Apps[win.appId].onClose();
    }
  },

  minimize(id) {
    const win = this.windows[id];
    if (!win || win.closed) return;

    win.minimized = true;
    win.el.classList.add('minimized');
  },

  restore(id) {
    const win = this.windows[id];
    if (!win || win.closed) return;

    win.minimized = false;
    win.el.classList.remove('minimized');
    this.focus(id);
  },

  // Find window by appId
  findByApp(appId) {
    return Object.values(this.windows).find(w => w.appId === appId && !w.closed);
  },

  restack() {
    const sorted = Object.values(this.windows)
      .filter(w => !w.closed)
      .sort((a, b) => parseInt(a.el.style.zIndex) - parseInt(b.el.style.zIndex));

    sorted.forEach((w, i) => {
      w.el.style.zIndex = 100 + i;
    });
    this.topZ = 100 + sorted.length;
  },

  // ── Drag ──
  startDrag(id, mx, my) {
    const win = this.windows[id];
    if (!win) return;

    const rect = win.el.getBoundingClientRect();
    this.dragState = {
      id,
      offsetX: mx - rect.left,
      offsetY: my - rect.top,
    };
    this.focus(id);
  },

  // ── Resize ──
  startResize(id, mx, my) {
    const win = this.windows[id];
    if (!win) return;

    this.resizeState = {
      id,
      startX: mx,
      startY: my,
      startW: win.el.offsetWidth,
      startH: win.el.offsetHeight,
    };
    this.focus(id);
  },

  handleMouseMove(e) {
    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const y = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (x == null) return;

    if (this.dragState) {
      const win = this.windows[this.dragState.id];
      if (!win) return;
      const newX = x - this.dragState.offsetX;
      const newY = Math.max(0, y - this.dragState.offsetY);
      win.el.style.left = newX + 'px';
      win.el.style.top = newY + 'px';
    }

    if (this.resizeState) {
      const win = this.windows[this.resizeState.id];
      if (!win) return;
      const dx = x - this.resizeState.startX;
      const dy = y - this.resizeState.startY;
      const newW = Math.max(300, this.resizeState.startW + dx);
      const newH = Math.max(200, this.resizeState.startH + dy);
      win.el.style.width = newW + 'px';
      win.el.style.height = newH + 'px';
    }
  },

  handleTouchMove(e) {
    if (this.dragState || this.resizeState) {
      e.preventDefault();
      this.handleMouseMove(e);
    }
  },

  handleMouseUp() {
    this.dragState = null;
    this.resizeState = null;
  },
};

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WindowManager.init());
} else {
  WindowManager.init();
}

window.WindowManager = WindowManager;
