// Core workspace system
const WorkspaceCore = {
  state: {
    isLocked: true,
    currentLayer: 'unlock'
  },

  init() {
    console.log('Workspace initializing...');
    this.setupEventListeners();
  },

  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM ready');
    });
  },

  showLayer(layerName) {
    const layers = ['unlock', 'desktop'];
    layers.forEach(name => {
      const layer = document.getElementById(`${name}-layer`);
      if (layer) {
        if (name === layerName) {
          layer.classList.remove('hidden');
        } else {
          layer.classList.add('hidden');
        }
      }
    });
    this.state.currentLayer = layerName;
  }
};

// Initialize on load
window.WorkspaceCore = WorkspaceCore;
WorkspaceCore.init();
