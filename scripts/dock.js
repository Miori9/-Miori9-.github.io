const DockSystem = {
  bar: null,
  items: [],

  apps: [
    { id: 'calendar', icon: '📅', label: 'Calendar' },
    { id: 'todo',     icon: '📝', label: 'Todo List' },
    { id: 'pomodoro', icon: '⏱️', label: 'Pomodoro' },
    { id: 'oc-gallery', icon: '👤', label: 'OC Gallery' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
    { id: 'pet-spawn', icon: '🐾', label: '召唤完能', special: true },
    { id: 'pet-hand',  icon: '🤚', label: '妈妈的手', special: true },
  ],

  init() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    // Build dock bar
    this.bar = document.createElement('div');
    this.bar.id = 'dock-bar';

    this.apps.forEach(app => {
      const item = document.createElement('div');
      item.className = 'dock-item';
      item.dataset.app = app.id;

      item.innerHTML = `
        <div class="dock-icon">${app.icon}</div>
        <div class="dock-label">${app.label}</div>
        <div class="dock-indicator"></div>
      `;

      item.addEventListener('click', () => this.launchApp(app.id));

      this.bar.appendChild(item);
      this.items.push({ el: item, app });
    });

    dock.appendChild(this.bar);

    // Magnification effect
    this.bar.addEventListener('mousemove', this.handleMagnify.bind(this));
    this.bar.addEventListener('mouseleave', this.resetMagnify.bind(this));
  },

  handleMagnify(e) {
    const barRect = this.bar.getBoundingClientRect();
    const mouseX = e.clientX;

    this.items.forEach(({ el }) => {
      const icon = el.querySelector('.dock-icon');
      const rect = el.getBoundingClientRect();
      const itemCenterX = rect.left + rect.width / 2;
      const dist = Math.abs(mouseX - itemCenterX);

      // Magnification curve: max 1.35x at center, falls off over 100px
      const maxScale = 1.35;
      const range = 100;
      const scale = dist < range
        ? 1 + (maxScale - 1) * (1 - dist / range)
        : 1;

      icon.style.transform = `scale(${scale})`;
    });
  },

  resetMagnify() {
    this.items.forEach(({ el }) => {
      const icon = el.querySelector('.dock-icon');
      icon.style.transform = 'scale(1)';
    });
  },

  launchApp(appId) {
    // Pet special actions
    if (appId === 'pet-spawn' && window.PetSystem) {
      PetSystem.spawnPet();
      return;
    }
    if (appId === 'pet-hand' && window.PetSystem) {
      const summoned = PetSystem.summonHand();
      // Update icon to show state
      const item = this.items.find(i => i.app.id === 'pet-hand');
      if (item) {
        const icon = item.el.querySelector('.dock-icon');
        icon.textContent = summoned ? '❌' : '🤚';
      }
      return;
    }

    // OC Gallery toggles abyss mode
    if (appId === 'oc-gallery' && window.HorrorMode) {
      HorrorMode.toggle();
    }

    if (!window.Apps || !Apps[appId]) {
      console.warn(`App "${appId}" not registered`);
      return;
    }

    // Check if window already exists
    if (window.WindowManager) {
      const existing = WindowManager.findByApp(appId);
      if (existing) {
        if (existing.minimized) {
          WindowManager.restore(existing.id);
        } else {
          WindowManager.focus(existing.id);
        }
        return;
      }
    }

    // Launch the app
    Apps[appId].launch();
  },

  updateIndicator(appId, active) {
    const item = this.items.find(i => i.app.id === appId);
    if (!item) return;

    if (active) {
      item.el.classList.add('active');
    } else {
      item.el.classList.remove('active');
    }
  },
};

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DockSystem.init());
} else {
  DockSystem.init();
}

window.DockSystem = DockSystem;
