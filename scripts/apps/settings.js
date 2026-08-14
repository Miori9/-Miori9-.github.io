const SettingsApp = {
  container: null,

  launch() {
    const content = document.createElement('div');
    this.container = content;
    this.render();

    WindowManager.create('settings', 'Settings', content, {
      width: 360,
      height: 460,
    });
  },

  render() {
    if (!this.container) return;

    const settings = this.loadSettings();

    this.container.innerHTML = `
      <div class="settings-section">
        <div class="settings-heading">外观</div>
        <label class="settings-toggle">
          <input type="checkbox" class="settings-cb" data-key="soundEnabled" ${settings.soundEnabled ? 'checked' : ''}>
          <span>启用音效</span>
        </label>
        <label class="settings-toggle">
          <input type="checkbox" class="settings-cb" data-key="notificationEnabled" ${settings.notificationEnabled ? 'checked' : ''}>
          <span>启用桌面通知</span>
        </label>
      </div>

      <div class="settings-section">
        <div class="settings-heading">数据</div>
        <button class="settings-btn" data-action="export">导出所有数据</button>
        <button class="settings-btn" data-action="import">导入数据</button>
        <button class="settings-btn danger" data-action="clear">清空所有数据</button>
      </div>

      <div class="settings-section">
        <div class="settings-heading">账户</div>
        <button class="settings-btn" data-action="lock">立即锁定</button>
      </div>
    `;

    // Toggle handlers
    this.container.querySelectorAll('.settings-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const s = this.loadSettings();
        s[cb.dataset.key] = cb.checked;
        this.saveSettings(s);

        if (cb.dataset.key === 'notificationEnabled' && cb.checked) {
          this.requestNotificationPermission();
        }
      });
    });

    // Button handlers
    this.container.querySelectorAll('.settings-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'export') this.exportData();
        if (action === 'import') this.importData();
        if (action === 'clear') this.clearData();
        if (action === 'lock') this.lockScreen();
      });
    });
  },

  loadSettings() {
    try {
      return JSON.parse(localStorage.getItem('dreamcore-settings')) || {
        soundEnabled: false,
        notificationEnabled: false,
      };
    } catch {
      return { soundEnabled: false, notificationEnabled: false };
    }
  },

  saveSettings(s) {
    localStorage.setItem('dreamcore-settings', JSON.stringify(s));
  },

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  exportData() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        todos: JSON.parse(localStorage.getItem('dreamcore-todos') || '[]'),
        settings: this.loadSettings(),
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `workspace-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);

          if (!data.version || !data.data) {
            alert('数据格式错误');
            return;
          }

          if (!confirm('导入会覆盖现有数据，是否继续？')) return;

          if (data.data.todos) {
            localStorage.setItem('dreamcore-todos', JSON.stringify(data.data.todos));
          }
          if (data.data.settings) {
            this.saveSettings(data.data.settings);
          }

          alert('导入成功');
          location.reload();
        } catch {
          alert('文件解析失败');
        }
      };
      reader.readAsText(file);
    });

    input.click();
  },

  clearData() {
    if (!confirm('此操作不可恢复，确定清空所有数据？')) return;
    if (!confirm('再次确认：清空后无法恢复')) return;

    localStorage.removeItem('dreamcore-todos');
    localStorage.removeItem('dreamcore-settings');
    location.reload();
  },

  lockScreen() {
    if (window.WorkspaceCore) {
      WorkspaceCore.showLayer('unlock');
      WorkspaceCore.state.isLocked = true;
    }
  },

  onClose() {
    this.container = null;
  },
};

window.Apps = window.Apps || {};
window.Apps.settings = SettingsApp;
