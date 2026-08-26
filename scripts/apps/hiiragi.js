const HiiragiApp = {
  windowId: null,

  launch() {
    const frame = document.createElement('iframe');
    frame.src = 'apps/hiiragi/index.html';
    frame.title = '柊野碎裂互动作品';
    frame.style.cssText = 'border: 0; width: 100%; height: 100%; display: block;';

    this.windowId = WindowManager.create('hiiragi', '柊野', frame, {
      width: Math.min(640, window.innerWidth - 32),
      height: Math.min(480, window.innerHeight - 32),
      x: 16,
      y: 16,
    });
    this.fit();
  },

  fit() {
    const record = WindowManager.windows[this.windowId];
    if (!record || record.closed) return;

    const width = Math.min(640, window.innerWidth - 32);
    const height = Math.min(480, window.innerHeight - 32);
    record.el.style.setProperty('width', `${width}px`, 'important');
    record.el.style.setProperty('height', `${height}px`, 'important');
    record.el.style.setProperty('left', `${Math.min(Math.max(16, parseFloat(record.el.style.left) || 16), Math.max(16, window.innerWidth - width - 16))}px`, 'important');
    record.el.style.setProperty('top', `${Math.min(Math.max(16, parseFloat(record.el.style.top) || 16), Math.max(16, window.innerHeight - height - 16))}px`, 'important');
  },

  onClose() {
    this.windowId = null;
  },
};

window.addEventListener('resize', () => HiiragiApp.fit());
window.Apps = window.Apps || {};
window.Apps.hiiragi = HiiragiApp;
