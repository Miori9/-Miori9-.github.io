const WallpaperSystem = {
  container: null,
  mode: 'normal',
  collageElements: [],

  init() {
    this.container = document.getElementById('wallpaper');
    if (!this.container) {
      console.error('Wallpaper container not found');
      return;
    }

    this.setupLayers();
    this.generateCollage();
  },

  setupLayers() {
    // Base layer
    const baseLayer = document.createElement('div');
    baseLayer.id = 'wallpaper-base';
    baseLayer.className = 'wallpaper-layer';
    this.container.appendChild(baseLayer);

    // Collage layer
    const collageLayer = document.createElement('div');
    collageLayer.id = 'wallpaper-collage';
    collageLayer.className = 'wallpaper-layer';
    this.container.appendChild(collageLayer);

    // Noise layer — canvas-generated, no external image needed
    const noiseLayer = document.createElement('div');
    noiseLayer.id = 'wallpaper-noise';
    noiseLayer.className = 'wallpaper-layer';
    this.container.appendChild(noiseLayer);
    this.generateNoiseTexture(noiseLayer);

    // Scanline
    const scanline = document.createElement('div');
    scanline.id = 'wallpaper-scanline';
    this.container.appendChild(scanline);
  },

  generateNoiseTexture(layer) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 40 + Math.random() * 60;
    }

    ctx.putImageData(imageData, 0, 0);
    layer.style.backgroundImage = `url(${canvas.toDataURL()})`;
    layer.style.backgroundRepeat = 'repeat';
  },

  generateCollage() {
    const collageLayer = document.getElementById('wallpaper-collage');
    if (!collageLayer) return;

    const elements = [
      // Geometric shapes
      ...this.createShapes(10),
      // Text fragments
      ...this.createTextFragments(8),
      // Lines
      ...this.createLines(5)
    ];

    elements.forEach(el => {
      collageLayer.appendChild(el);
      this.collageElements.push(el);
    });
  },

  createShapes(count) {
    const shapes = [];
    const shapeTypes = ['circle', 'triangle', 'rect'];

    for (let i = 0; i < count; i++) {
      const shape = document.createElement('div');
      shape.className = 'collage-element collage-shape';

      const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      const size = 50 + Math.random() * 150;

      shape.style.left = `${Math.random() * 100}%`;
      shape.style.top = `${Math.random() * 100}%`;
      shape.style.width = `${size}px`;
      shape.style.height = `${size}px`;
      shape.style.opacity = `${0.15 + Math.random() * 0.25}`;

      if (type === 'circle') {
        shape.style.borderRadius = '50%';
      } else if (type === 'triangle') {
        shape.style.width = '0';
        shape.style.height = '0';
        shape.style.borderLeft = `${size/2}px solid transparent`;
        shape.style.borderRight = `${size/2}px solid transparent`;
        shape.style.borderBottom = `${size}px solid #444444`;
        shape.style.border = 'none';
        shape.style.borderBottom = `${size}px solid #444444`;
      }

      shape.style.transform = `rotate(${Math.random() * 360}deg)`;

      shapes.push(shape);
    }

    return shapes;
  },

  createTextFragments(count) {
    const fragments = [];
    const words = [
      'ERROR', 'VOID', 'NULL', 'LOST', 'ECHO',
      'STATIC', 'SIGNAL', 'BREAK', 'FADE', 'CORRUPT'
    ];

    for (let i = 0; i < count; i++) {
      const text = document.createElement('div');
      text.className = 'collage-element collage-text';
      text.textContent = words[Math.floor(Math.random() * words.length)];

      text.style.left = `${Math.random() * 90}%`;
      text.style.top = `${Math.random() * 90}%`;
      text.style.opacity = `${0.15 + Math.random() * 0.25}`;
      text.style.fontSize = `${10 + Math.random() * 20}px`;

      fragments.push(text);
    }

    return fragments;
  },

  createLines(count) {
    const lines = [];

    for (let i = 0; i < count; i++) {
      const line = document.createElement('div');
      line.className = 'collage-element';

      const length = 50 + Math.random() * 200;
      line.style.width = `${length}px`;
      line.style.height = '1px';
      line.style.background = '#444444';
      line.style.left = `${Math.random() * 100}%`;
      line.style.top = `${Math.random() * 100}%`;
      line.style.opacity = `${0.15 + Math.random() * 0.25}`;
      line.style.transform = `rotate(${Math.random() * 180}deg)`;

      lines.push(line);
    }

    return lines;
  },

  setMode(mode) {
    this.mode = mode;

    if (mode === 'abyss') {
      // Will be implemented in Phase 3
      console.log('Abyss mode - to be implemented');
    } else {
      // Reset to normal
      this.collageElements.forEach(el => {
        el.style.transition = 'all 1s ease-out';
      });
    }
  }
};

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WallpaperSystem.init());
} else {
  WallpaperSystem.init();
}

window.WallpaperSystem = WallpaperSystem;
