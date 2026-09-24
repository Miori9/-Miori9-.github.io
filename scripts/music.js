// One audio element is the source of truth for the CD, transport and timeline.
class DesktopAudioPlayer {
  constructor(audio, tracks, onChange = () => {}) {
    this.audio = audio;
    this.tracks = tracks;
    this.onChange = onChange;
    this.index = 0;
    this.state = 'idle';
    this.message = '点击 CD 开始播放';
    this.wantPlay = false;
    this.version = 0;
    this.failedVersion = -1;
    this.failures = 0;
    this.timer = null;
    audio.addEventListener('playing', () => {
      if (!this.wantPlay) { audio.pause(); return; }
      clearTimeout(this.timer);
      this.failures = 0;
      this.failedVersion = -1;
      this.update('playing', '正在播放');
    });
    audio.addEventListener('pause', () => {
      // Failed media may also emit pause; leave its bounded skip in charge.
      if (audio.paused && this.wantPlay && !audio.ended && !audio.error && this.failedVersion !== this.version) this.pause();
    });
    audio.addEventListener('waiting', () => {
      if (this.wantPlay) {
        this.update('loading', '缓冲中…');
        this.watchLoading(this.version);
      }
    });
    audio.addEventListener('error', () => {
      if (audio.error) this.fail(this.version);
    });
    audio.addEventListener('ended', () => {
      if (this.wantPlay) this.select(this.index + 1);
    });
    ['timeupdate', 'loadedmetadata', 'durationchange'].forEach(event => audio.addEventListener(event, () => this.onChange(this)));
    this.load(0, false);
  }

  update(state, message) {
    this.state = state;
    this.message = message;
    this.onChange(this);
  }

  load(index, autoplay) {
    if (!this.tracks.length) return;
    const version = ++this.version;
    clearTimeout(this.timer);
    this.wantPlay = false;
    this.audio.pause();
    this.index = (index + this.tracks.length) % this.tracks.length;
    this.audio.src = `https://music.163.com/song/media/outer/url?id=${this.tracks[this.index].id}.mp3`;
    this.audio.load();
    this.update('idle', '点击 CD 开始播放');
    if (autoplay) this.play(version);
  }

  select(index) {
    this.failures = 0;
    this.load(index, true);
  }

  toggle() {
    if (this.wantPlay) this.pause();
    else {
      this.failures = 0;
      if (this.audio.error || this.state === 'error') this.load(this.index, true);
      else this.play(++this.version);
    }
  }

  play(version) {
    this.wantPlay = true;
    this.update('loading', '正在连接网易云…');
    this.watchLoading(version);
    // Keep play() inside the click/tap handler, including on iOS.
    this.audio.play().catch(error => {
      if (version !== this.version || !this.wantPlay) return;
      if (error.name === 'NotAllowedError') {
        this.pause();
        this.update('blocked', '浏览器暂停了播放，请再点一次 CD');
      } else if (error.name !== 'AbortError') this.fail(version);
    });
  }

  watchLoading(version) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.fail(version), 15000);
  }

  fail(version) {
    if (version !== this.version || !this.wantPlay || this.failedVersion === version) return;
    this.failedVersion = version;
    clearTimeout(this.timer);
    this.failures++;
    if (this.failures >= Math.min(5, this.tracks.length)) {
      this.pause();
      this.update('error', '暂时无法播放，可重试或在网易云中打开');
      return;
    }
    this.update('loading', '此曲暂不可播放，正在尝试下一首…');
    this.timer = setTimeout(() => {
      if (version === this.version && this.wantPlay) this.load(this.index + 1, true);
    }, 650);
  }

  pause() {
    ++this.version;
    clearTimeout(this.timer);
    this.wantPlay = false;
    this.audio.pause();
    this.update('paused', '已暂停');
  }

  seek(ratio) {
    if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      this.audio.currentTime = Math.max(0, Math.min(1, ratio)) * this.audio.duration;
      this.onChange(this);
    }
  }
}

function initDesktopMusic() {
  const panel = document.getElementById('music-player');
  if (!panel) return;
  const byId = id => document.getElementById(id);
  const playlist = window.DESKTOP_PLAYLIST;
  const tracks = playlist?.tracks?.filter(track => Number.isSafeInteger(track.id) && track.id > 0 && typeof track.name === 'string');
  if (!tracks?.length) {
    byId('music-song-title').textContent = '歌单暂未载入';
    byId('music-status').textContent = '请刷新，或在网易云中打开歌单';
    panel.querySelectorAll('button, input').forEach(button => { button.disabled = true; });
    return;
  }
  byId('music-playlist-name').textContent = playlist.name;
  const cover = byId('cd-artwork');
  if (typeof playlist.cover === 'string' && /^https:\/\/p\d+\.music\.126\.net\//.test(playlist.cover)) {
    cover.addEventListener('error', () => { cover.src = 'assets/images/eye-realistic.png'; }, { once: true });
    cover.src = playlist.cover;
  }
  const list = byId('music-track-list');
  const seek = byId('music-seek');
  const cd = byId('cd-toggle');
  const playButton = byId('music-play');
  const time = value => {
    const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  let displayedIndex = -1;
  let displayedState = '';
  let seeking = false;
  const render = player => {
    const track = tracks[player.index];
    const duration = Number.isFinite(player.audio.duration) ? player.audio.duration : track.duration;
    if (displayedIndex !== player.index) {
      if (displayedIndex >= 0) list.children[displayedIndex]?.firstElementChild.removeAttribute('aria-current');
      list.children[player.index]?.firstElementChild.setAttribute('aria-current', 'true');
      displayedIndex = player.index;
      byId('music-song-title').textContent = track.name;
      byId('music-song-title').title = track.name;
      byId('music-artist').textContent = track.artist;
      byId('music-count').textContent = `${String(player.index + 1).padStart(2, '0')} / ${tracks.length}`;
    }
    if (displayedState !== player.state) {
      displayedState = player.state;
      panel.classList.toggle('is-playing', player.state === 'playing');
      byId('music-indicator').textContent = player.state === 'playing' ? '●' : '○';
    }
    const label = player.wantPlay ? '暂停' : '播放';
    cd.setAttribute('aria-label', `${label}歌单`);
    cd.setAttribute('aria-pressed', String(player.wantPlay));
    cd.querySelector('.cd-action').textContent = player.wantPlay ? 'PAUSE' : 'PLAY';
    playButton.setAttribute('aria-label', label);
    playButton.textContent = player.wantPlay ? 'Ⅱ' : '▶';
    if (byId('music-status').textContent !== player.message) byId('music-status').textContent = player.message;
    byId('music-duration').textContent = time(duration);
    seek.disabled = !(player.audio.duration > 0 && Number.isFinite(player.audio.duration));
    if (!seeking) {
      byId('music-elapsed').textContent = time(player.audio.currentTime);
      seek.value = duration > 0 ? Math.round(player.audio.currentTime / duration * 1000) : 0;
    }
    seek.setAttribute('aria-valuetext', `${byId('music-elapsed').textContent} / ${time(duration)}`);
  };
  const player = new DesktopAudioPlayer(byId('desktop-audio'), tracks, render);
  cd.addEventListener('click', () => player.toggle());
  playButton.addEventListener('click', () => player.toggle());
  byId('music-next').addEventListener('click', () => player.select(player.index + 1));
  byId('music-prev').addEventListener('click', () => player.select(player.index - 1));
  seek.addEventListener('input', () => {
    seeking = true;
    byId('music-elapsed').textContent = time(player.audio.duration * Number(seek.value) / 1000);
  });
  seek.addEventListener('change', () => { seeking = false; player.seek(Number(seek.value) / 1000); });
  seek.addEventListener('pointercancel', () => { seeking = false; render(player); });
  byId('music-list-toggle').addEventListener('click', () => {
    list.hidden = !list.hidden;
    byId('music-list-toggle').setAttribute('aria-expanded', String(!list.hidden));
  });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      list.hidden = true;
      byId('music-list-toggle').setAttribute('aria-expanded', 'false');
      byId('music-list-toggle').focus();
    }
  });
  tracks.forEach((track, index) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${String(index + 1).padStart(2, '0')}  ${track.name}`;
    const artist = document.createElement('small');
    artist.textContent = `${track.artist} · ${time(track.duration)}`;
    button.appendChild(artist);
    button.addEventListener('click', () => {
      player.select(index);
      list.hidden = true;
      byId('music-list-toggle').setAttribute('aria-expanded', 'false');
    });
    li.appendChild(button);
    list.appendChild(li);
  });
  list.children[0].firstElementChild.setAttribute('aria-current', 'true');
  // Locking the desktop pauses its music; minimizing another app does not.
  new MutationObserver(() => {
    if (document.getElementById('desktop-layer').classList.contains('hidden')) player.pause();
  }).observe(document.getElementById('desktop-layer'), { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pagehide', () => player.pause());
}

if (typeof module !== 'undefined' && module.exports) module.exports = { DesktopAudioPlayer };
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDesktopMusic);
  else initDesktopMusic();
}
