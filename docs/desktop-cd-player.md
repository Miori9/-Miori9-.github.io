# Desktop files and CD player

The desktop uses white folder shortcuts for the existing eight applications and
pet actions. `DockSystem` keeps its existing launch and window-indicator API;
WindowManager still owns application windows. A pointer drag moves a folder
without launching it. Normalized positions are saved locally and kept inside
the file area when the viewport changes. “整理桌面” restores the default layout.

On screens at most 900 px wide or at most 580 px high, folders use a scrollable
grid and a tap opens the app. The music panel and folders stay in the same page.
The new top/bottom bars are accounted for in the Hiiragi window's fit routine.

## Personal theme

The lock screen uses `assets/video/start-background.mp4`, a 1280×720 MP4
converted from the supplied MOV without changing the original. It loops muted
and inline; it pauses when the desktop opens or the browser page is hidden.
If autoplay is blocked, the image poster remains and a tap retries playback.
The username is read-only `MOM`; the existing Zalgo/unlock sequence remains.

`assets/images/desktop-background.jpg` is the supplied desktop image, centered
with cover sizing beneath the existing noise and scanline. The old decorative
collage and large background text are hidden. The menu reads `ZHONGYE'S DESKTOP`
and `Everyone else is me too`. The music panel is visually scaled to two thirds;
mobile transport buttons retain 44 px touch targets.

Abyss mode colors folders and interface text `#B00000`, and the CD uses a native
SVG luminance-to-red filter capped at the same red value. One random folder and an open window title briefly
flicker every 1.8–5 seconds. These added flickers respect reduced motion and are
cancelled on exit. Exiting restores the original folder colors, text and CD.

## Music source

- Fixed playlist: <https://music.163.com/playlist?id=583921157>
- Name at import: Lovien507喜欢的音乐
- Imported directory: 357 tracks, including IDs, names, artists and durations.
- `assets/music/playlist.js` is a public metadata snapshot, not audio files.
- Audio streams from NetEase's public `song/media/outer/url` endpoint on demand.
- The page requests HTTPS upgrades for the official endpoint's HTTP redirects.
- No NetEase credentials, third-party music proxy, audio downloads or backend.

The playlist JSON endpoint does not permit cross-origin reads from GitHub Pages.
Therefore the fixed directory is generated before publishing and loads with the
page. Later changes to the NetEase playlist require re-running:

```sh
node tools/sync-playlist.mjs
```

Commit and deploy the regenerated `assets/music/playlist.js` to update the site.
This does not run automatically in visitors' browsers. The sync tool checks all
song IDs and fetches metadata for the full playlist, not just its six preview
tracks. Failed imports leave the previous snapshot in place.

The CD starts rotating on the audio element's `playing` event. Pausing or
buffering stops rotation; the slider uses actual currentTime and duration. One
click/tap calls `play()` synchronously. Browser gesture rejection prompts another
tap without changing songs. Previous/next and selecting a playlist entry use the
same audio element; an ended track advances through the directory.

NetEase decides which tracks can be externally played, depending on rights,
region and availability. On a failed load the player tries the next track, stopping
after five consecutive failures rather than cycling indefinitely. The official
playlist link remains available. Locking the desktop and leaving the page pause
music; minimizing an application does not pause it.

## Verification

```sh
node --test tests/*.test.cjs
node --check scripts/dock.js
node --check scripts/music.js
node --check scripts/apps/hiiragi.js
node --check assets/music/playlist.js
git diff --check
```

The nine focused tests cover real play/pause/buffering state, seeking, previous/
next/end advancement, stale request rejection, blocked gestures, bounded failure
recovery, recovery followed by another buffering timeout, cancelling retries, and
complete unique playlist metadata.

Local browser checks at 1440×900, 390×844 and 844×390 verified desktop opening,
one-window reuse, minimize/restore, dragging without opening, position persistence
after reload, scrollable mobile file layout and Hiiragi's canvas and boundaries.
Real audio reached `readyState=4`, its timeline advanced, and CD animation followed
play/pause. In this test the first three tracks could not play externally; the
fourth played successfully. Physical iPhone Safari and the deployed HTTPS Pages
site still require checks before claiming those environments passed.

Two additional theme tests cover video visibility/autoplay rejection and bounded
flicker timing/cleanup/reduced motion. Browser checks confirmed MP4 playback at
1280×720 (6.19-second loop), the visible `MOM` label, video pause after unlocking,
red folders/text/CD in abyss and restoration on exit. A 390×844 viewport has no
horizontal overflow and retains 44×44 px music transport buttons. These are
browser viewport checks, not physical iPhone tests.
