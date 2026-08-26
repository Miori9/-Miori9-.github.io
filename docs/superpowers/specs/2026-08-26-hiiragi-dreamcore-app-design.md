# 柊野 Dreamcore 应用设计

**日期**：2026-08-26  
**状态**：用户已确认，待实施

## 目标

将 p5.js 碎裂互动作品接入 GitHub 当前 Dreamcore Workspace。用户在 Dock 点击“柊野”图标后，作品通过现有 WindowManager 打开；重复点击聚焦已有窗口，关闭后可重新打开。

## 架构

```text
DockSystem（柊野图标）
  └─ Apps.hiiragi.launch()
       └─ WindowManager.create('hiiragi', '柊野', iframe)
            └─ apps/hiiragi/index.html
                 ├─ p5.js 2.3.1
                 ├─ sketch.js
                 └─ assets/IMG_2563.PNG、IMG_2565.PNG、IMG_2566.PNG
```

作品保持在 iframe 内，避免 p5 的全局函数和画布样式影响 Workspace 主页面。

## 文件和行为

- `index.html`：在 `dock.js` 之前载入 `scripts/apps/hiiragi.js`。
- `scripts/dock.js`：增加 `{ id: 'hiiragi', icon: '👁', label: '柊野' }`，复用 Dock 既有点击、活动指示器与重复窗口聚焦逻辑。
- `scripts/apps/hiiragi.js`：注册 `Apps.hiiragi`，用 iframe 作为窗口内容并通过 WindowManager 创建标题为“柊野”的窗口。
- `apps/hiiragi/`：存放独立 HTML、CSS、p5 脚本与三张 PNG 素材。
- p5 作品实现首次二分、点击碎片继续二分、早期/后期图片切换、红白边缘粒子、重叠泛光、Zalgo 文本和鼠标/iOS 触屏单次触发保护。

## 响应式与失败处理

- 柊野窗口默认上限为 640×480，但首次打开和浏览器 `resize` 时都按视口减 16px 边距限制宽高与位置。
- iframe 设置可访问标题，加载的 p5 页面显示加载中状态；素材加载失败时显示错误文字并停止作品绘制。
- `onClose()` 只清除应用窗口引用；窗口管理、Dock、宠物与其他应用保持原有行为。

## 验收

1. 解锁后 Dock 出现“柊野”图标，点击只打开一个 WindowManager 窗口。
2. 再点图标聚焦/恢复同一窗口；关闭后可以重新打开。
3. 窗口在 390×844 与 844×390 视口内显示标题栏和关闭按钮；旋转/缩放后仍在视口内。
4. iframe 显示初始图，连续鼠标点击能切割目标碎片。
5. iOS Safari 触屏每次只切割一次，且 GitHub Pages 能加载 p5 CDN 与三张相对路径素材。
