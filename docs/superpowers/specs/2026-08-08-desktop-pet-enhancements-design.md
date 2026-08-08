# 桌宠功能增强设计文档

**日期**: 2026-08-08  
**作者**: Claude (Merlin)  
**状态**: 待审核

## 概述

本设计为现有桌宠系统添加两个新功能：
1. 限定窗口撞击功能（仅在宠物接近窗口边缘时随机触发）
2. 新增"妈妈的手"可拖拽物件（吸引所有宠物靠近）

## 需求总结

### 功能 1：窗口撞击优化

**当前行为**：
- `_doInteract()` 方法让宠物主动走向窗口并推动它

**目标行为**：
- 宠物随机行走时，如果接近浮动窗口（FloatWindow），有概率触发撞击
- 撞击序列：显示"！"对话框 → 用加速的 walk 动作冲向窗口 → 撞击效果（推动窗口 OR 弹回）
- 不在窗口附近时不会触发撞击

### 功能 2："妈妈的手"物件

**物件特性**：
- 使用提供的粉色指甲手图片
- 可通过点击抓取/放置（第一次点击抓取，移动鼠标，第二次点击放置）
- 全局只能有一个手
- 尺寸约 80-100px 高度（比宠物小）

**宠物交互**：
- 手放置后，所有宠物会被持续吸引
- 宠物走向手并停留在附近（尽量贴近手）
- Sleep/cry 状态完成后才会走向手
- 手位置改变时，宠物立刻调整方向追过去

## 整体架构

### 现有系统概览

- `DesktopPet` 类：管理单个宠物的状态、动画、行为
- `FloatWindow` 类：可拖拽的浮动窗口
- 行为系统：通过 `scheduleBehavior()` → `randomBehavior()` 循环触发随机行为

### 新增组件

#### 1. HandObject 类

可拖拽的"妈妈的手"物件：
- 单例模式（全局只有一个实例）
- 可点击抓取/放置
- 持续通知所有宠物其位置

#### 2. 窗口撞击系统

扩展 `DesktopPet` 类：
- 在随机行走（`walkFree`）中检测是否接近窗口
- 新增 `chargeWindow(targetWindow)` 方法处理撞击序列
- 新增 `detectNearbyWindows()` 方法检测附近窗口

#### 3. 手追踪系统

扩展 `DesktopPet` 类：
- 新增 `handTrackingTimer` 定时器（每 100ms 检测）
- 新增 `chaseHand()` 方法处理追手行为
- 新增 `isChasing` 和 `handArrived` 标志位

### 数据流

```
HandObject 位置变化
    ↓
所有 DesktopPet 通过 handTrackingTimer 检测
    ↓
符合条件的宠物调用 chaseHand()
    ↓
宠物走向手并停留
```

## 详细设计

### 窗口撞击功能

#### 触发条件

- 宠物在 `walkFree()` 随机行走时
- 检测到前方有 FloatWindow 且距离 < 200px
- 30% 概率触发撞击（保持随机性）

#### 撞击序列

**1. 准备阶段（0.5秒）**：
- 停止当前移动
- 显示 "！" 对话框（使用现有 `speak()` 方法）
- 宠物面向窗口方向

**2. 加速冲刺阶段（持续到撞击）**：
- 移动速度：`CONFIG.walkSpeed * 2`
- 动画播放速度：1.5x（通过调整 `animationFrameDelay`）
- 使用 walk 动画

**3. 撞击效果（随机二选一）**：

**效果 A（50%概率）**：窗口被推动
- 调用 `window.nudge(dx, dy)`，力度根据冲刺方向计算
- 宠物停在窗口边缘
- 短暂 idle 后恢复正常行为

**效果 B（50%概率）**：宠物弹回
- 窗口不动或轻微震动
- 宠物反向弹回 50-80px
- 播放短暂的 cry 动画（表示撞疼了）
- 然后恢复正常行为

#### 实现细节

**新增方法**：

```javascript
DesktopPet.detectNearbyWindows()
// 返回距离 < 200px 的最近窗口，如果没有返回 null

DesktopPet.chargeWindow(targetWindow)
// 执行完整的撞击序列
// 1. 显示"！"
// 2. 加速冲向窗口
// 3. 随机选择推动或弹回效果
```

**修改现有方法**：

- `walkFree()`: 在设定新目标前调用 `detectNearbyWindows()`，如果发现窗口且随机数 < 0.3，调用 `chargeWindow()` 而不是继续 walk
- 删除 `_doInteract()` 方法及其所有调用

### "妈妈的手"物件功能

#### HandObject 类结构

```javascript
class HandObject {
    constructor() {
        this.element = null;      // DOM 元素
        this.x = 0;               // 当前 X 坐标
        this.y = 0;               // 当前 Y 坐标
        this.isDragging = false;  // 是否正在拖拽
        this.isPlaced = false;    // 是否已放置（首次放置后为 true）
        
        this.init();
    }
    
    init() {
        // 创建 DOM 元素
        // 设置初始位置（屏幕中央）
        // 绑定点击和移动事件
    }
    
    startDrag() {
        // 进入拖拽状态
    }
    
    moveTo(x, y) {
        // 更新位置
        // 触发宠物追踪更新
    }
    
    endDrag() {
        // 结束拖拽，标记为已放置
    }
    
    remove() {
        // 从 DOM 移除
        // 通知所有宠物停止追踪
    }
}
```

#### 全局单例管理

- 使用全局变量 `window.motherHand = null`
- 页面上只能有一个手
- 如果已存在，点击按钮时提示用户"手已存在，请移动现有的手"

#### 交互流程

**创建手**：
1. 点击"召唤妈妈的手"按钮
2. 手出现在屏幕中央
3. 自动进入拖拽状态（`isDragging = true`, `isPlaced = false`）
4. 半透明显示（opacity: 0.6）

**拖拽放置**：
1. 移动鼠标，手跟随鼠标移动
2. 再次点击鼠标，放置手
3. 退出拖拽状态（`isDragging = false`, `isPlaced = true`）
4. 完全不透明显示（opacity: 1.0）
5. 所有宠物开始追踪手

**重新移动**：
1. 点击已放置的手
2. 重新进入拖拽状态
3. 移动后再次点击放置

#### 视觉设计

- 图片：miori 提供的粉色指甲手图片（IMG_9117.PNG）
- 尺寸：高度 80-100px（宽度按比例缩放）
- 未放置时：opacity: 0.6，cursor: grabbing
- 已放置时：opacity: 1.0，cursor: grab
- 拖拽时：cursor: grabbing

#### UI 按钮

在现有按钮区域添加：
```html
<button id="summon-hand-btn">召唤妈妈的手 🤚</button>
```

样式与现有按钮保持一致。

### 宠物追踪手的行为系统

#### 实时追踪机制

每个 `DesktopPet` 实例新增属性：
- `handTrackingTimer`: 定时器 ID
- `isChasing`: 布尔值，表示是否正在追手
- `handArrived`: 布尔值，表示是否已到达手附近

#### 追踪逻辑

**定时检测（每 100ms）**：
```javascript
if (window.motherHand && window.motherHand.isPlaced) {
    // 手存在且已放置
    if (this.state === 'sleep' || this.state === 'cry') {
        // 等待当前状态结束
        return;
    }
    
    const distance = Math.hypot(
        window.motherHand.x - this.x,
        window.motherHand.y - this.y
    );
    
    if (distance < 30) {
        // 已到达手附近
        this.handArrived = true;
        this.isChasing = false;
        // 保持 idle 状态，停止 scheduleBehavior
    } else {
        // 追向手
        this.chaseHand();
    }
} else {
    // 手不存在或未放置
    if (this.isChasing || this.handArrived) {
        // 恢复正常行为
        this.isChasing = false;
        this.handArrived = false;
        this.scheduleBehavior();
    }
}
```

#### chaseHand() 方法

```javascript
DesktopPet.chaseHand() {
    // 1. 打断当前行为（除了 sleep/cry）
    // 2. 计算到手的方向和距离
    // 3. 设置目标位置为手的当前位置
    // 4. 使用 walk 动画
    // 5. 移动速度：CONFIG.walkSpeed * 1.5
    // 6. 标记 isChasing = true
}
```

#### 手位置变化响应

当手被拖拽移动时：
```javascript
HandObject.moveTo(x, y) {
    this.x = x;
    this.y = y;
    // 更新 DOM 位置
    
    // 通知所有已到达的宠物重新追踪
    pets.forEach(pet => {
        if (pet.handArrived) {
            pet.handArrived = false;
            // 下次 timer 触发时会自动开始追踪
        }
    });
}
```

#### 优先级管理

**手的吸引力优先级**：
- 手的吸引力 > 所有随机行为
- 但不中断 sleep/cry（等状态结束后才追手）
- 到达手后，暂停 `scheduleBehavior`（不再触发随机行为）
- 手消失时，恢复正常的 `randomBehavior` 循环

**与其他行为的冲突处理**：
- 如果宠物被拖拽：暂停追手，拖拽结束后继续
- 如果宠物正在撞窗口：撞击完成后再追手

#### 性能优化

- 只有当手存在且已放置时，才启动 `handTrackingTimer`
- 手被删除时，清理所有宠物的 timer：
  ```javascript
  pets.forEach(pet => {
      if (pet.handTrackingTimer) {
          clearInterval(pet.handTrackingTimer);
          pet.handTrackingTimer = null;
      }
  });
  ```

## 错误处理和边界情况

### 窗口撞击相关

**窗口在撞击过程中被关闭**：
- 检测到目标窗口不存在时，立即停止冲刺
- 恢复正常行为

**宠物在冲刺中被拖拽**：
- 拖拽优先级高于撞击
- 取消撞击序列
- 进入拖拽状态

### 手相关

**手被移动到屏幕外**：
- 宠物仍会追过去
- 可能看起来像"消失"了（这是预期行为）

**多只宠物同时到达手**：
- 会重叠在一起
- 这是预期行为，表示"挤在一起"的效果

**手被删除**：
- 所有宠物的 `handArrived` 和 `isChasing` 重置为 false
- 清理所有 `handTrackingTimer`
- 恢复正常的随机行为

### 状态一致性

**页面切换（visibilitychange）**：
- 保持手的状态（位置、isPlaced）
- 宠物的追踪状态通过 timer 自动恢复

**新生成的宠物**：
- 在构造函数中自动检测 `window.motherHand` 的存在
- 如果手存在且已放置，自动开始追踪

## 测试验证点

### 窗口撞击功能

1. ✓ 宠物走近窗口时，约 30% 概率触发撞击
2. ✓ 撞击时显示"！"对话框
3. ✓ 撞击时宠物加速冲向窗口（速度和动画都加快）
4. ✓ 50% 推动窗口，50% 弹回
5. ✓ 不在窗口附近时不会触发撞击
6. ✓ 窗口关闭时撞击行为正确中断

### "妈妈的手"功能

1. ✓ 点击按钮召唤手
2. ✓ 手可拖拽（点击抓取 → 移动 → 点击放置）
3. ✓ 手放置后，所有非 sleep/cry 的宠物开始走向手
4. ✓ 宠物到达手后停留（idle 动画）
5. ✓ 移动手时，已到达的宠物立刻追过去
6. ✓ sleep/cry 的宠物完成动画后才走向手
7. ✓ 页面只能有一个手（重复点击按钮时提示）
8. ✓ 手可以重新移动（点击已放置的手重新抓取）

### 性能测试

1. ✓ 20 只宠物同时追手时，页面流畅（FPS > 30）
2. ✓ 没有手时，不启动追踪 timer（内存占用正常）
3. ✓ 手被删除时，timer 正确清理

### 兼容性测试

1. ✓ 桌面浏览器：Chrome、Firefox、Safari
2. ✓ 移动浏览器：iOS Safari、Android Chrome
3. ✓ 触摸操作：手的拖拽在触摸设备上正常工作

## 实现计划

实现顺序：
1. 实现 HandObject 类和基础拖拽功能
2. 实现宠物追踪手的行为系统
3. 实现窗口撞击功能
4. 删除旧的 `_doInteract()` 逻辑
5. 添加 UI 按钮和样式
6. 测试和调优

详细的实现计划将在下一阶段（writing-plans）生成。

## 未来可能的扩展

- 多个不同类型的物件（食物、玩具等）
- 宠物到达手后的特殊动画（摸头、抱起等）
- 手的不同状态（招手、挥手、比心等）
- 宠物之间的互动（争抢位置）

## 附录

### 相关文件

- `index.html`: 主文件，包含所有代码
- 宠物图片：walk*.png, cry*.png, sleep*.png, default.png 等
- 手的图片：IMG_9117.PNG（需要添加到项目中）

### 配置参数

```javascript
CONFIG = {
    walkSpeed: 2,           // 正常行走速度
    chargeSpeed: 4,         // 撞击冲刺速度 (walkSpeed * 2)
    chaseSpeed: 3,          // 追手速度 (walkSpeed * 1.5)
    chargeChance: 0.3,      // 撞击触发概率
    windowDetectRange: 200, // 窗口检测范围
    handArriveRange: 30,    // 到达手的距离判定
    handTrackInterval: 100  // 手追踪检测间隔 (ms)
}
```
