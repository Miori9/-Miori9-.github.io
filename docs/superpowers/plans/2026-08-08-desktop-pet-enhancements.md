# Desktop Pet Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add window collision detection with charge sequence and draggable "mother's hand" object that attracts all pets.

**Architecture:** Extend existing DesktopPet class with window detection and hand-tracking systems. Create new HandObject class as singleton for pet attraction. Use state-machine for collision, real-time polling for hand tracking.

**Tech Stack:** Vanilla JavaScript, HTML5, CSS3

## Global Constraints

- Single-file architecture: all code in `index.html`
- No external dependencies
- Maintain existing pet behavior system (scheduleBehavior, randomBehavior)
- CONFIG object for all timing/distance parameters
- Git commit after each task completion

---

### Task 1: Add Hand Image Asset

**Files:**
- Create: `IMG_9117.PNG` (provided by user, pink nail hand image)
- Verify image exists in project root

**Interfaces:**
- Produces: `IMG_9117.PNG` file path for HandObject class

- [ ] **Step 1: Verify hand image exists**

Check if the image file `IMG_9117.PNG` exists in project root:

```bash
ls -la IMG_9117.PNG
```

Expected: File exists, approximately 80-100px height

- [ ] **Step 2: If missing, request from user**

If image not found, ask user to provide the pink nail hand image.

- [ ] **Step 3: Commit**

```bash
git add IMG_9117.PNG
git commit -m "feat: add mother's hand image asset"
```

---

### Task 2: Add Configuration Parameters

**Files:**
- Modify: `index.html:136-145` (CONFIG object)

**Interfaces:**
- Produces: CONFIG.chargeSpeed, CONFIG.chaseSpeed, CONFIG.chargeChance, CONFIG.windowDetectRange, CONFIG.handArriveRange, CONFIG.handTrackInterval

- [ ] **Step 1: Add new config parameters**

Add after line 145 in CONFIG object:

```javascript
chargeSpeed: 5,          // Window charge speed (walkSpeed * 2)
chaseSpeed: 3.75,        // Hand chase speed (walkSpeed * 1.5)
chargeChance: 0.3,       // 30% trigger probability
windowDetectRange: 200,  // Window detection distance (px)
handArriveRange: 30,     // Hand arrival threshold (px)
handTrackInterval: 100   // Hand tracking check interval (ms)
```

- [ ] **Step 2: Verify config loads**

Open browser console and check:

```javascript
console.log(CONFIG.chargeSpeed, CONFIG.chaseSpeed);
```

Expected: `5 3.75`

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add config parameters for collision and hand tracking"
```

---

### Task 3: Implement HandObject Class

**Files:**
- Modify: `index.html:176` (insert before FloatWindow class)

**Interfaces:**
- Produces: `class HandObject` with methods: `init()`, `startDrag()`, `moveTo(x, y)`, `endDrag()`, `remove()`
- Produces: `window.motherHand` global singleton

- [ ] **Step 1: Implement HandObject class**

Insert before `class FloatWindow` at line 176:

```javascript
// ════════════════════════════════
//  妈妈的手
// ════════════════════════════════
class HandObject {
    constructor() {
        this.element = null;
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.isDragging = false;
        this.isPlaced = false;
        this.init();
    }

    init() {
        // Create DOM element
        this.element = document.createElement('img');
        this.element.src = 'IMG_9117.PNG';
        this.element.style.position = 'fixed';
        this.element.style.height = '90px';
        this.element.style.width = 'auto';
        this.element.style.cursor = 'grab';
        this.element.style.opacity = '0.6';
        this.element.style.zIndex = '9998';
        this.element.style.pointerEvents = 'auto';
        this.element.style.userSelect = 'none';
        this.element.style.webkitUserDrag = 'none';
        
        document.body.appendChild(this.element);
        this._updatePosition();
        
        // Start dragging immediately on creation
        this.isDragging = true;
        this.element.style.cursor = 'grabbing';
        
        // Bind events
        this.element.addEventListener('mousedown', (e) => this._onMouseDown(e));
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
        document.addEventListener('mouseup', (e) => this._onMouseUp(e));
    }

    _onMouseDown(e) {
        if (!this.isPlaced) return; // Already dragging on first placement
        e.preventDefault();
        this.isDragging = true;
        this.element.style.cursor = 'grabbing';
        this.element.style.opacity = '0.6';
    }

    _onMouseMove(e) {
        if (!this.isDragging) return;
        this.moveTo(e.clientX - 45, e.clientY - 45); // Center on cursor
    }

    _onMouseUp(e) {
        if (!this.isDragging) return;
        this.endDrag();
    }

    moveTo(x, y) {
        this.x = Math.max(0, Math.min(x, window.innerWidth - 90));
        this.y = Math.max(0, Math.min(y, window.innerHeight - 90));
        this._updatePosition();
        
        // Notify pets that hand moved
        if (this.isPlaced) {
            pets.forEach(pet => {
                if (pet.handArrived) {
                    pet.handArrived = false;
                }
            });
        }
    }

    _updatePosition() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }

    endDrag() {
        this.isDragging = false;
        this.isPlaced = true;
        this.element.style.cursor = 'grab';
        this.element.style.opacity = '1.0';
        
        // Start all pets tracking
        pets.forEach(pet => pet._startHandTracking());
    }

    remove() {
        // Clean up all pet tracking
        pets.forEach(pet => {
            if (pet.handTrackingTimer) {
                clearInterval(pet.handTrackingTimer);
                pet.handTrackingTimer = null;
            }
            pet.isChasing = false;
            pet.handArrived = false;
        });
        
        this.element.remove();
        window.motherHand = null;
    }
}
```

- [ ] **Step 2: Test HandObject creation**

Run in browser console:

```javascript
if (window.motherHand) window.motherHand.remove();
window.motherHand = new HandObject();
```

Expected: Hand appears at center, can be dragged, click to place, opacity changes

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: implement HandObject class with drag-and-place"
```

---

### Task 4: Add UI Button for Hand

**Files:**
- Modify: `index.html:100` (FAB button group styles)
- Modify: `index.html:680` (button handler)

**Interfaces:**
- Consumes: `window.motherHand`, `class HandObject`
- Produces: `#summon-hand-btn` button

- [ ] **Step 1: Add button HTML**

Find the FAB button group (around line 100-120) and add new button:

```html
<button id="summon-hand-btn" class="fab-btn" title="召唤妈妈的手">🤚</button>
```

Add before closing `</div>` of `#fab-group`.

- [ ] **Step 2: Add button click handler**

Add after DOMContentLoaded (around line 680):

```javascript
document.getElementById('summon-hand-btn').addEventListener('click', () => {
    if (window.motherHand) {
        alert('手已存在，请移动现有的手');
        return;
    }
    window.motherHand = new HandObject();
});
```

- [ ] **Step 3: Test button**

Open page, click 🤚 button.

Expected: Hand appears, can be dragged and placed. Clicking button again shows alert.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add UI button to summon mother's hand"
```

---

### Task 5: Add Hand Tracking to DesktopPet

**Files:**
- Modify: `index.html:352-376` (DesktopPet constructor)
- Modify: `index.html:654` (DesktopPet destroy method)

**Interfaces:**
- Consumes: `window.motherHand`, `CONFIG.handTrackInterval`, `CONFIG.handArriveRange`, `CONFIG.chaseSpeed`
- Produces: `pet.handTrackingTimer`, `pet.isChasing`, `pet.handArrived`, `pet.chaseHand()`, `pet._startHandTracking()`, `pet._stopHandTracking()`

- [ ] **Step 1: Add tracking properties to constructor**

Add after line 362 in constructor:

```javascript
this.handTrackingTimer = null;
this.isChasing = false;
this.handArrived = false;
```

- [ ] **Step 2: Start tracking in constructor if hand exists**

Add after line 375 in constructor:

```javascript
// Start hand tracking if hand exists and is placed
if (window.motherHand && window.motherHand.isPlaced) {
    this._startHandTracking();
}
```

- [ ] **Step 3: Add tracking methods to DesktopPet**

Add before `destroy()` method (around line 654):

```javascript
_startHandTracking() {
    if (this.handTrackingTimer) return; // Already tracking
    
    this.handTrackingTimer = setInterval(() => {
        if (!window.motherHand || !window.motherHand.isPlaced) {
            // Hand removed or not placed
            if (this.isChasing || this.handArrived) {
                this.isChasing = false;
                this.handArrived = false;
                this._stopHandTracking();
                if (!this.isDragging && this.currentAnimation !== 'sleep' && this.currentAnimation !== 'cry') {
                    this.scheduleBehavior();
                }
            }
            return;
        }
        
        // Don't interrupt sleep or cry
        if (this.currentAnimation === 'sleep' || this.currentAnimation === 'cry') {
            return;
        }
        
        const dx = window.motherHand.x - this.x;
        const dy = window.motherHand.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < CONFIG.handArriveRange) {
            // Arrived at hand
            if (!this.handArrived) {
                this.handArrived = true;
                this.isChasing = false;
                clearInterval(this.walkInterval);
                clearTimeout(this.behaviorTimer);
                this.returnToIdle();
            }
        } else {
            // Chase hand
            if (!this.isChasing) {
                this.chaseHand();
            }
        }
    }, CONFIG.handTrackInterval);
}

_stopHandTracking() {
    if (this.handTrackingTimer) {
        clearInterval(this.handTrackingTimer);
        this.handTrackingTimer = null;
    }
}

chaseHand() {
    if (!window.motherHand || !window.motherHand.isPlaced) return;
    if (this.isDragging) return;
    if (this.currentAnimation === 'sleep' || this.currentAnimation === 'cry') return;
    
    this.isChasing = true;
    this.handArrived = false;
    
    // Stop current behavior
    clearTimeout(this.behaviorTimer);
    clearInterval(this.walkInterval);
    
    // Calculate target
    const tx = window.motherHand.x;
    const ty = window.motherHand.y;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len < 5) {
        this.handArrived = true;
        this.isChasing = false;
        return;
    }
    
    const nx = dx / len;
    const ny = dy / len;
    
    // Use walk animation
    const anim = nx >= 0 ? 'walkRight' : 'walk';
    this.currentAnimation = anim;
    this.playLoop(ANIMATIONS[anim], CONFIG.frameRate);
    
    clearInterval(this.walkInterval);
    this.walkInterval = setInterval(() => {
        if (!this.isChasing) {
            clearInterval(this.walkInterval);
            return;
        }
        
        if (!window.motherHand || !window.motherHand.isPlaced) {
            this.isChasing = false;
            clearInterval(this.walkInterval);
            this.returnToIdle();
            return;
        }
        
        const rdx = window.motherHand.x - this.x;
        const rdy = window.motherHand.y - this.y;
        const rem = Math.sqrt(rdx * rdx + rdy * rdy);
        
        if (rem < CONFIG.chaseSpeed) {
            this.x = window.motherHand.x;
            this.y = window.motherHand.y;
            this.handArrived = true;
            this.isChasing = false;
            clearInterval(this.walkInterval);
            this.returnToIdle();
        } else {
            this.x += nx * CONFIG.chaseSpeed;
            this.y += ny * CONFIG.chaseSpeed;
            this.updatePosition();
        }
    }, 30);
}
```

- [ ] **Step 4: Update destroy method**

Modify destroy() at line 654 to include hand tracking cleanup:

```javascript
destroy() {
    this.clearAll();
    clearTimeout(this.interactTimer);
    this._stopHandTracking();
    this.container.remove();
}
```

- [ ] **Step 5: Stop hand tracking when dragging**

Modify `_setupDrag` mousedown handler (around line 556) to add after `this.clearAll()`:

```javascript
if (moved && !this.isDragging) {
    this.isDragging = true;
    mouseMoved = true;
    this.clearAll();
    this.isChasing = false;  // ADD THIS LINE
    this.handArrived = false; // ADD THIS LINE
    this.currentAnimation = 'catch';
    // ... rest of code
}
```

- [ ] **Step 6: Test hand tracking**

Open page, create hand, place it. Create 2-3 pets.

Expected: All pets walk toward hand and stop nearby. Moving hand causes pets to re-chase.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: implement pet hand-tracking behavior system"
```

---

### Task 6: Implement Window Collision Detection

**Files:**
- Modify: `index.html:453-462` (walkFree method)

**Interfaces:**
- Consumes: `windows` array, `CONFIG.windowDetectRange`, `CONFIG.chargeChance`
- Produces: `pet.detectNearbyWindows()` method

- [ ] **Step 1: Add detectNearbyWindows method**

Add before `destroy()` method:

```javascript
detectNearbyWindows() {
    if (windows.length === 0) return null;
    
    let nearest = null;
    let minDist = CONFIG.windowDetectRange;
    
    for (const win of windows) {
        // Calculate distance to window center
        const wx = win.x + win.w / 2;
        const wy = win.y + win.h / 2;
        const dx = wx - this.x;
        const dy = wy - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDist) {
            minDist = dist;
            nearest = win;
        }
    }
    
    return nearest;
}
```

- [ ] **Step 2: Modify walkFree to check for windows**

Replace walkFree method at line 453:

```javascript
walkFree() {
    // Check for nearby windows and maybe charge
    const nearWindow = this.detectNearbyWindows();
    if (nearWindow && Math.random() < CONFIG.chargeChance) {
        this.chargeWindow(nearWindow);
        return;
    }
    
    // Normal random walk
    const angle = Math.random() * Math.PI * 2;
    const dist  = 120 + Math.random() * 250;
    let tx = this.x + Math.cos(angle) * dist;
    let ty = this.y + Math.sin(angle) * dist;
    tx = Math.max(0, Math.min(tx, window.innerWidth - 150));
    ty = Math.max(0, Math.min(ty, window.innerHeight - 150));
    this._walkTo(tx, ty);
}
```

- [ ] **Step 3: Test window detection**

Create window and pet, let pet walk freely.

Expected: detectNearbyWindows returns window when within 200px, null otherwise.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add window detection to pet walking behavior"
```

---

### Task 7: Implement Window Charge Sequence

**Files:**
- Modify: `index.html:654` (add chargeWindow method before destroy)

**Interfaces:**
- Consumes: `FloatWindow.nudge(dx, dy)`, `CONFIG.chargeSpeed`, `pet.speak(text)`
- Produces: `pet.chargeWindow(targetWindow)` method

- [ ] **Step 1: Implement chargeWindow method**

Add before `destroy()` method:

```javascript
chargeWindow(targetWindow) {
    if (!targetWindow || this.isDragging) return;
    
    // Clear current behavior
    this.clearAll();
    
    // Phase 1: Show "!" and prepare (0.5s)
    this.speak('！');
    this.returnToIdle();
    
    setTimeout(() => {
        if (!targetWindow || windows.indexOf(targetWindow) === -1) {
            // Window was closed during preparation
            this.scheduleBehavior();
            return;
        }
        
        // Phase 2: Charge toward window center
        const tx = targetWindow.x + targetWindow.w / 2 - 75;
        const ty = targetWindow.y + targetWindow.h / 2 - 75;
        const dx = tx - this.x;
        const dy = ty - this.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len < 5) {
            this.scheduleBehavior();
            return;
        }
        
        const nx = dx / len;
        const ny = dy / len;
        
        // Use walk animation at 1.5x speed
        const anim = nx >= 0 ? 'walkRight' : 'walk';
        this.currentAnimation = anim;
        this.playLoop(ANIMATIONS[anim], CONFIG.frameRate / 1.5);
        
        clearInterval(this.walkInterval);
        this.walkInterval = setInterval(() => {
            if (windows.indexOf(targetWindow) === -1) {
                // Window closed during charge
                clearInterval(this.walkInterval);
                this.returnToIdle();
                return;
            }
            
            const rdx = tx - this.x;
            const rdy = ty - this.y;
            const rem = Math.sqrt(rdx * rdx + rdy * rdy);
            
            if (rem < CONFIG.chargeSpeed) {
                // Reached window - apply effect
                clearInterval(this.walkInterval);
                
                // 50/50: push window or bounce back
                if (Math.random() < 0.5) {
                    // Effect A: Push window
                    const pushAngle = Math.atan2(dy, dx);
                    const pushDist = 80 + Math.random() * 60;
                    targetWindow.nudge(
                        Math.cos(pushAngle) * pushDist,
                        Math.sin(pushAngle) * pushDist
                    );
                    this.speak('！');
                    this.returnToIdle();
                } else {
                    // Effect B: Bounce back
                    this.x -= nx * (50 + Math.random() * 30);
                    this.y -= ny * (50 + Math.random() * 30);
                    this.updatePosition();
                    this.cry();
                }
            } else {
                this.x += nx * CONFIG.chargeSpeed;
                this.y += ny * CONFIG.chargeSpeed;
                this.updatePosition();
            }
        }, 30);
    }, 500);
}
```

- [ ] **Step 2: Test charge sequence**

Create window, spawn pet nearby, wait for charge to trigger.

Expected: Pet shows "!", charges at 2x speed, either pushes window or bounces back with cry.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: implement window charge sequence with push/bounce effects"
```

---

### Task 8: Remove Old Interact System

**Files:**
- Modify: `index.html:514-540` (remove _scheduleInteract and _doInteract)
- Modify: `index.html:375` (remove _scheduleInteract call from constructor)
- Modify: `index.html:654` (remove clearTimeout(this.interactTimer) from destroy)
- Modify: `index.html:362` (remove this.interactTimer from constructor)

**Interfaces:**
- Removes: `pet._scheduleInteract()`, `pet._doInteract()`, `pet.interactTimer`

- [ ] **Step 1: Remove _scheduleInteract call from constructor**

Delete line around 375:

```javascript
// this._scheduleInteract(); // DELETE THIS LINE
```

- [ ] **Step 2: Remove interactTimer from constructor**

Delete line around 361:

```javascript
// this.interactTimer = null; // DELETE THIS LINE
```

- [ ] **Step 3: Remove _scheduleInteract and _doInteract methods**

Delete lines 514-540 (entire methods).

- [ ] **Step 4: Remove interactTimer cleanup from destroy**

In destroy() method (line 654), remove:

```javascript
// clearTimeout(this.interactTimer); // DELETE THIS LINE
```

- [ ] **Step 5: Test removal**

Open page, create pets and windows.

Expected: Pets only charge windows when walking nearby (30% chance), not on automatic timer.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "refactor: remove old automatic window interaction system"
```

---

### Task 9: Final Integration Testing

**Files:**
- Test: `index.html` (all features)

**Interfaces:**
- Validates: All tasks 1-8 working together

- [ ] **Step 1: Test complete workflow**

Full test sequence:
1. Open page with 5 pets and 2 windows
2. Summon mother's hand and place it
3. Verify all pets walk toward hand
4. Move hand to new location
5. Verify pets re-chase
6. Let pets walk freely and watch for window charges
7. Verify approximately 30% trigger rate
8. Verify both push and bounce effects occur

- [ ] **Step 2: Performance test**

Create 20 pets and 1 hand.

Expected: Smooth animation, no lag, FPS > 30.

- [ ] **Step 3: Test edge cases**

Test scenarios:
- Drag pet while chasing hand → pet stops chasing
- Close window during charge → pet returns to idle
- Sleep/cry pets → wait until animation ends before chasing hand

- [ ] **Step 4: Browser compatibility**

Test in Chrome, Firefox, Safari (desktop).

Expected: All features work in all browsers.

- [ ] **Step 5: Final commit**

```bash
git add index.html
git commit -m "test: validate complete desktop pet enhancement integration"
```

---

## Testing Checklist

After all tasks complete, verify:

- [ ] Window collision triggers ~30% when pet walks near window
- [ ] Collision shows "!" dialog before charge
- [ ] Charge uses faster walk animation
- [ ] 50% push window, 50% bounce back with cry
- [ ] Hand can be summoned via button
- [ ] Hand can be dragged and placed
- [ ] All pets chase placed hand
- [ ] Pets stop near hand (within 30px)
- [ ] Moving hand causes pets to re-chase
- [ ] Sleep/cry pets wait until animation ends before chasing
- [ ] Only one hand can exist at a time
- [ ] Dragging pet stops hand tracking
- [ ] No console errors
- [ ] Smooth performance with 20 pets

