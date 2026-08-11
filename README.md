# Dreamcore Workspace

沉浸式恐慌梦核克苏鲁风格工作台

## Phase 1: Core Framework & Unlock System ✅

### Features
- ✅ Realistic eye tracking on unlock screen
- ✅ Interactive unlock sequence (click eye → sewn → glitch → reveal)
- ✅ Dreamcore collage wallpaper with geometric shapes and text fragments
- ✅ Mobile touch support
- ✅ Smooth animations and transitions

### Project Structure
```
/
├── index.html              # Main entry point
├── styles/
│   ├── main.css           # Base styles and layout
│   ├── animations.css     # Animation keyframes
│   └── horror-effects.css # Visual effects (TBD)
├── scripts/
│   ├── core.js           # Core system
│   ├── unlock.js         # Unlock screen logic
│   └── wallpaper.js      # Wallpaper generation
└── assets/
    ├── images/
    │   ├── eye-open.png  # Eye image (to be replaced)
    │   └── eye-sewn.png  # Sewn eye (to be replaced)
    └── textures/
        └── noise.png     # Noise texture (to be created)
```

### Usage

1. Open `index.html` in a modern browser
2. Move mouse to see eye tracking
3. Click eye to unlock and reveal workspace

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari / Chrome

### Next Steps (Phase 2)
- Window management system
- Dock navigation
- Three tools: Calendar, Todo List, Pomodoro

### Development

**Git Workflow:**
```bash
# Feature branch
git checkout -b feature/phase2-windows

# Commit frequently
git add .
git commit -m "feat: add specific feature"

# Push when ready
git push origin feature/phase2-windows
```

**Testing Checklist:**
- [ ] Desktop: Chrome, Firefox, Safari
- [ ] Mobile: iOS Safari, Android Chrome
- [ ] Unlock sequence plays smoothly
- [ ] Eye tracking works with mouse and touch
- [ ] Wallpaper elements are visible
- [ ] No console errors
