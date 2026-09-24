const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

test('lock video plays muted only while the lock screen and page are visible', async () => {
  const context = { window: {}, document: { readyState: 'loading', hidden: false, addEventListener() {} } };
  vm.runInNewContext(readFileSync(require.resolve('../scripts/unlock.js'), 'utf8'), context);
  const unlock = context.window.UnlockSystem;
  let locked = true;
  let plays = 0;
  let pauses = 0;
  unlock.unlockLayer = { classList: { contains: () => !locked } };
  unlock.backgroundVideo = {
    muted: false,
    play() { plays++; return Promise.reject(new Error('autoplay blocked')); },
    pause() { pauses++; }
  };
  unlock.syncBackgroundVideo();
  await Promise.resolve(); // Browser rejection must not become unhandled.
  assert.equal(unlock.backgroundVideo.muted, true);
  assert.equal(plays, 1);
  locked = false;
  unlock.syncBackgroundVideo();
  assert.equal(pauses, 1);
  locked = true;
  context.document.hidden = true;
  unlock.syncBackgroundVideo();
  assert.equal(pauses, 2);
  context.document.hidden = false;
  unlock.syncBackgroundVideo();
  await Promise.resolve();
  assert.equal(plays, 2);
});

test('abyss flickers icons and titles at bounded intervals and cancels on exit', () => {
  const frames = new Map();
  let frameId = 0;
  let reduced = false;
  const animations = [];
  const element = () => ({ style: {}, animate() {
    const animation = { cancelled: false, cancel() { this.cancelled = true; } };
    animations.push(animation);
    return animation;
  } });
  const icon = element();
  const title = element();
  const context = {
    window: { matchMedia: () => ({ matches: reduced }) },
    document: { addEventListener() {}, querySelectorAll(selector) {
      return selector.includes('file-icon') ? [icon] : [title];
    } },
    Math: Object.assign(Object.create(Math), { random: () => 0 }),
    setTimeout() {},
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  vm.runInNewContext(readFileSync(require.resolve('../scripts/horror-mode.js'), 'utf8'), context);
  const horror = context.window.HorrorMode;
  const frame = time => {
    const [id, fn] = frames.entries().next().value;
    frames.delete(id);
    fn(time);
  };
  horror.isActive = true;
  horror.startContinuousEffects();
  frame(0);
  assert.equal(animations.length, 2, 'one folder and one window title flicker');
  frame(1000);
  assert.equal(animations.length, 2, 'no rapid repeating flashes');
  frame(5000);
  assert.equal(animations.length, 4);
  assert.ok(animations.slice(0, 2).every(a => a.cancelled));
  reduced = true;
  frame(10000);
  assert.equal(animations.length, 4, 'reduced motion suppresses new flickers');
  horror.stopContinuousEffects();
  assert.equal(frames.size, 0);
  assert.ok(animations.every(a => a.cancelled));
});
