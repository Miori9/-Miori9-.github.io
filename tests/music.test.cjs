const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

function fixture() {
  const timers = new Map();
  let nextTimer = 0;
  const context = { module: { exports: {} },
    setTimeout(fn) { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout(id) { timers.delete(id); } };
  vm.runInNewContext(readFileSync(require.resolve('../scripts/music.js'), 'utf8'), context);
  class Audio extends EventTarget {
    currentTime = 0; duration = NaN; error = null; ended = false; paused = true;
    requests = [];
    load() { this.currentTime = 0; this.duration = NaN; this.error = null; }
    pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
    play() { this.paused = false; return new Promise((resolve, reject) => this.requests.push({ resolve, reject })); }
    emit(event) { this.dispatchEvent(new Event(event)); }
  }
  const audio = new Audio();
  const tracks = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `Song ${i}`, duration: 120 }));
  const player = new context.module.exports.DesktopAudioPlayer(audio, tracks);
  function tick() {
    const timer = timers.entries().next().value;
    assert.ok(timer, 'expected a pending retry or timeout');
    timers.delete(timer[0]);
    timer[1]();
  }
  return { player, audio, timers, tick };
}

test('CD follows real playing/paused/buffering state, never a click-only animation', () => {
  const { player, audio, timers } = fixture();
  assert.equal(audio.requests.length, 0, 'no autoplay on page load');
  player.toggle();
  assert.equal(audio.requests.length, 1, 'play requested synchronously in the gesture');
  assert.equal(player.state, 'loading');
  audio.emit('playing');
  assert.equal(player.state, 'playing');
  audio.emit('waiting');
  assert.equal(player.state, 'loading');
  audio.emit('playing');
  player.toggle();
  assert.equal(player.state, 'paused');
  assert.equal(timers.size, 0);
});

test('next, previous, end of track and seeking use the same audio instance', () => {
  const { player, audio } = fixture();
  player.select(1);
  assert.equal(player.index, 1);
  assert.match(audio.src, /id=2\.mp3$/);
  audio.duration = 120;
  player.seek(0.5);
  assert.equal(audio.currentTime, 60);
  player.select(-1);
  assert.equal(player.index, 6);
  audio.ended = true;
  audio.emit('ended');
  assert.equal(player.index, 0);
  player.pause();
});

test('a late rejection from a previous song cannot skip the newly selected song', async () => {
  const { player, audio } = fixture();
  player.toggle();
  const old = audio.requests[0];
  player.select(3);
  old.reject(new Error('old request failed'));
  await Promise.resolve();
  assert.equal(player.index, 3);
  assert.equal(player.failures, 0);
  audio.emit('playing');
  assert.equal(player.state, 'playing');
  player.pause();
});

test('blocked browser playback stops and asks for a gesture, without skipping songs', async () => {
  const { player, audio, timers } = fixture();
  player.toggle();
  audio.requests[0].reject(Object.assign(new Error('gesture needed'), { name: 'NotAllowedError' }));
  await Promise.resolve();
  assert.equal(player.state, 'blocked');
  assert.equal(player.wantPlay, false);
  assert.equal(player.index, 0);
  assert.equal(timers.size, 0);
});

test('unavailable songs retry a bounded number and do not spin indefinitely', () => {
  const { player, audio, timers, tick } = fixture();
  player.toggle();
  for (let i = 0; i < 5; i++) {
    audio.error = { code: 4 };
    audio.emit('error');
    audio.emit('error'); // duplicate error events must not count twice
    audio.pause(); // a failed media resource can emit pause after error
    assert.equal(player.failures, i + 1);
    if (i < 4) tick();
  }
  assert.equal(player.state, 'error');
  assert.equal(player.wantPlay, false);
  assert.equal(timers.size, 0);
});

test('pause cancels a pending automatic skip', () => {
  const { player, audio, timers } = fixture();
  player.toggle();
  audio.error = { code: 4 };
  audio.emit('error');
  player.pause();
  assert.equal(timers.size, 0);
  assert.equal(player.index, 0);
});

test('recovery after a timeout does not disable later buffering recovery', () => {
  const { player, audio, timers, tick } = fixture();
  player.toggle();
  tick(); // Initial loading times out; skip is pending.
  audio.emit('playing'); // Playback recovers before the skip executes.
  assert.equal(player.index, 0);
  assert.equal(player.state, 'playing');
  assert.equal(timers.size, 0);
  audio.emit('waiting');
  tick(); // A later stall must still schedule recovery.
  tick();
  assert.equal(player.index, 1);
  assert.equal(player.state, 'loading');
  player.pause();
});

test('system pause while buffering cancels retries and waits for the user', () => {
  const { player, audio, timers } = fixture();
  player.toggle();
  audio.emit('waiting');
  audio.pause();
  assert.equal(player.state, 'paused');
  assert.equal(player.wantPlay, false);
  assert.equal(timers.size, 0);
});

test('the shipped playlist contains unique valid IDs and usable metadata', () => {
  const scope = { window: {} };
  vm.runInNewContext(readFileSync(require.resolve('../assets/music/playlist.js'), 'utf8'), scope);
  const playlist = scope.window.DESKTOP_PLAYLIST;
  assert.equal(playlist.id, 583921157);
  assert.ok(playlist.tracks.length > 6, 'must not ship only the six preview tracks');
  assert.equal(new Set(playlist.tracks.map(t => t.id)).size, playlist.tracks.length);
  assert.ok(playlist.tracks.every(t => Number.isSafeInteger(t.id) && t.id > 0 && t.name && t.artist && t.duration > 0));
});
