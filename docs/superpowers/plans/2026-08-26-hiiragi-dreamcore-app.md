# 柊野 Dreamcore 应用 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将柊野 p5 碎裂作品作为 Dreamcore Workspace 的 Dock 应用接入。

**Architecture:** 独立作品页位于 `apps/hiiragi/`，由一个最小的 `Apps.hiiragi` iframe 适配器交给已有 WindowManager。Dock 只添加一个数据项，绝不复制窗口管理或 p5 到主页面。

**Tech Stack:** 原生 HTML/CSS/JavaScript、p5.js 2.3.1、GitHub Pages。

**Spec:** `docs/superpowers/specs/2026-08-26-hiiragi-dreamcore-app-design.md`

## Global Constraints

- 不添加框架、构建工具或 npm 依赖。
- p5 必须固定为 2.3.1；三张图片只使用 `apps/hiiragi/assets/` 相对路径。
- 图标与窗口标题均为“柊野”，并复用 DockSystem 和 WindowManager。
- 鼠标与 iOS 触屏通过同一 350ms 入口限流；不声明 `scale`、`distance`、`second`。
- 柊野窗口在初次打开与 viewport resize 后保留 16px 可见边距，桌面尺寸上限为 640×480。

---

### Task 1: 创建独立的柊野作品页

**Files:**
- Create: `apps/hiiragi/index.html`
- Create: `apps/hiiragi/style.css`
- Create: `apps/hiiragi/sketch.js`
- Create: `apps/hiiragi/assets/IMG_2563.PNG`
- Create: `apps/hiiragi/assets/IMG_2565.PNG`
- Create: `apps/hiiragi/assets/IMG_2566.PNG`

**Interfaces:**
- Produces: 可通过 `apps/hiiragi/index.html` 加载的 p5 iframe 页面。

- [ ] **Step 1: 写入最小失败检查并执行。**

Run: `test -f apps/hiiragi/index.html`

Expected: non-zero exit status。

- [ ] **Step 2: 新建 HTML、CSS 与三张本地素材。**

HTML 仅加载 `style.css`、p5 2.3.1 CDN 与 `sketch.js`；CSS 令页面和 canvas 填满 iframe 并禁用滚动/默认触摸手势。将 Downloads 中三张对应 PNG 原样复制到 `apps/hiiragi/assets/`。

- [ ] **Step 3: 实现安全的 p5 互动脚本。**

`sketch.js` 使用 `loadImage()` Promise 加载三张图片，未就绪或失败时只渲染状态文字。保留 `handleInteraction(x, y)` 作为唯一切割入口，`mousePressed()` 与 p5 `touchStarted()` 都调用它，入口第一行使用 `lastInteractionAt` 的 350ms 限流。实现设计指定的二分、纹理、粒子、泛光与文字效果，且仅用安全变量名 `textureScale`、`separationDistance`、`otherPiece`。

- [ ] **Step 4: 验证并提交。**

Run:

```bash
node --check apps/hiiragi/sketch.js
test -s apps/hiiragi/assets/IMG_2563.PNG
test -s apps/hiiragi/assets/IMG_2565.PNG
test -s apps/hiiragi/assets/IMG_2566.PNG
! rg -n 'const (scale|distance|second)\\b' apps/hiiragi/sketch.js
```

Expected: 全部成功。

```bash
git add apps/hiiragi
git commit -m "feat: add hiiragi fracture app"
```

### Task 2: 注册 Dock 图标和 WindowManager 应用

**Files:**
- Modify: `index.html`（在 `dock.js` 前载入新应用模块）
- Modify: `scripts/dock.js`（新增柊野 Dock 数据项）
- Create: `scripts/apps/hiiragi.js`

**Interfaces:**
- Consumes: `WindowManager.create(appId, title, content, options)`、`Apps` 注册表、`apps/hiiragi/index.html`。
- Produces: `Apps.hiiragi.launch()` 与 `Apps.hiiragi.onClose()`。

- [ ] **Step 1: 验证 Dock 尚未注册柊野。**

Run: `rg -n "hiiragi|柊野|apps/hiiragi" index.html scripts/dock.js scripts/apps`

Expected: non-zero exit status。

- [ ] **Step 2: 新建最小 WindowManager 适配器。**

`scripts/apps/hiiragi.js` 注册 `Apps.hiiragi`。`launch()` 创建一个 `iframe`（`src = 'apps/hiiragi/index.html'`，`title = '柊野碎裂互动作品'`，无边框、100% 宽高），并用 `WindowManager.create('hiiragi', '柊野', frame, options)` 创建窗口。应用自身维护返回的窗口 id；`fit()` 在首次打开和 `resize` 时限制窗口宽高至 `min(640, innerWidth - 32)` / `min(480, innerHeight - 32)`，并将 left/top 限制在 16px 边距内。`onClose()` 清空 id。

- [ ] **Step 3: 添加图标与脚本标签。**

在 `scripts/dock.js` 的 `apps` 数组中加入：

```javascript
{ id: 'hiiragi', icon: '👁', label: '柊野' },
```

在 `index.html` 的 `dock.js` 之前加入：

```html
<script src="scripts/apps/hiiragi.js"></script>
```

- [ ] **Step 4: 验证与提交。**

Run:

```bash
node --check scripts/apps/hiiragi.js
node -e "const fs=require('fs'); const dock=fs.readFileSync('scripts/dock.js','utf8'); const index=fs.readFileSync('index.html','utf8'); for (const value of ['hiiragi','柊野']) if (!dock.includes(value)) process.exit(1); if (!index.includes('scripts/apps/hiiragi.js')) process.exit(1)"
git diff --check
```

Expected: 全部成功。

```bash
git add index.html scripts/dock.js scripts/apps/hiiragi.js
git commit -m "feat: launch hiiragi from dock"
```

### Task 3: 整合验收

**Files:**
- Verify: `index.html`, `scripts/dock.js`, `scripts/apps/hiiragi.js`, `apps/hiiragi/`

- [ ] **Step 1: 运行最终静态验证。**

Run:

```bash
node --check apps/hiiragi/sketch.js
node --check scripts/apps/hiiragi.js
git diff --check origin/main..HEAD
git status --short
```

Expected: 语法和空白检查成功，工作树干净。

- [ ] **Step 2: 用本地静态服务器验收。**

解锁 Workspace，点击柊野 Dock 图标。检查 iframe canvas 出现、二次点击复用窗口、关闭后可重开；在 390×844 与 844×390 下确认标题栏和关闭按钮可见；再进行 iOS Safari 与部署后 GitHub Pages 的实机点触验收。
