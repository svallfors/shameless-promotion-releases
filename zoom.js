// ZOOM TEST (Hampus 2026-10-04): "the classic zoom out based on scroll to
// reveal the full UI". Two layers in one frame: Hampus's window recording of
// the app playing the film (demo-dark.mp4, 1920x1228) and, laid exactly over
// its stage, the sharp 1080p film itself (showcase.mp4) - so the zoomed-in
// start is as crisp as the plain video. Scrolling through the section pulls
// the view back from the stage to the whole window; the visible box keeps the
// film's width the whole way.
'use strict';
(() => {
  const section = document.querySelector('.zoom');
  if (!section) return;
  const stick = section.querySelector('.zoom-stick');
  const frame = section.querySelector('.zoom-frame');
  const app = section.querySelector('.zoom-app');
  const film = section.querySelector('.zoom-film');
  const cap = section.querySelector('.zoom-cap');

  // the recording's geometry, in its own pixels (measured from its frames)
  const REC = { w: 1920, h: 1228 };
  const WIN = { x: 59, y: 40, w: 1802, h: 1111, r: 12 };          // the app window
  const STAGE = { x: 313.5, y: 124, w: 1292.5, h: 726.5, r: 14 }; // the film inside it
  // the film in the recording runs this far behind the recording's clock; its
  // first half second and last three are the app paused (guides showing), so
  // the film is the clock and the recording follows the playing span
  const OFFSET = 0.48;
  const FILM_RADIUS = 16; // page px - the plain video's corners

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 720px)');

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  let u = 1; // page px per recording px
  let still = false;

  const layout = () => {
    still = reduceMotion || narrow.matches;
    section.classList.toggle('static', still);
    const B = Math.min(stick.clientWidth * (narrow.matches ? 1 : 0.88), 1440); // the plain video's width
    u = B / WIN.w;
    frame.style.width = `${REC.w * u}px`;
    frame.style.height = `${REC.h * u}px`;
    Object.assign(film.style, {
      left: `${STAGE.x * u}px`, top: `${STAGE.y * u}px`,
      width: `${STAGE.w * u}px`, height: `${STAGE.h * u}px`,
      borderRadius: `${STAGE.r * u}px`,
    });
    if (still) {
      // narrow: the film alone, as on the live page; reduced motion: the window
      const p = narrow.matches ? 0 : 1;
      const R = p ? WIN : STAGE;
      stick.style.height = `${(WIN.w / R.w) * R.h * u + 40}px`;
    } else {
      stick.style.height = '';
    }
    draw();
  };

  const progress = () => {
    if (still) return narrow.matches ? 0 : 1;
    const r = section.getBoundingClientRect();
    const travel = r.height - innerHeight;
    return travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
  };

  const draw = () => {
    const e = ease(progress());
    const R = {
      x: lerp(STAGE.x, WIN.x, e), y: lerp(STAGE.y, WIN.y, e),
      w: lerp(STAGE.w, WIN.w, e), h: lerp(STAGE.h, WIN.h, e),
    };
    const s = WIN.w / R.w; // the visible box keeps the plain video's width
    const W = stick.clientWidth;
    const H = still ? stick.clientHeight - 40 : stick.clientHeight;
    const cx = W / 2, cy = H / 2;
    const tx = cx - s * (R.x + R.w / 2) * u;
    const ty = cy - s * (R.y + R.h / 2) * u;
    frame.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    const radius = lerp(FILM_RADIUS, WIN.r * u * s, e) / s; // in the frame's own px
    frame.style.clipPath = `inset(${R.y * u}px ${(REC.w - R.x - R.w) * u}px ${(REC.h - R.y - R.h) * u}px ${R.x * u}px round ${radius}px)`;
    if (cap) cap.style.top = `${cy + (s * R.h * u) / 2 + 12}px`;
  };

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', layout);
  narrow.addEventListener('change', layout);
  layout();

  // ---- the two clocks: the film leads, the recording follows ----
  const recTime = () => OFFSET + film.currentTime;
  const follow = () => {
    if (app.readyState >= 1 && Math.abs(app.currentTime - recTime()) > 0.12) app.currentTime = recTime();
  };
  const tick = () => {
    follow();
    if ('requestVideoFrameCallback' in film) film.requestVideoFrameCallback(tick);
  };
  if ('requestVideoFrameCallback' in film) film.requestVideoFrameCallback(tick);
  else film.addEventListener('timeupdate', follow);
  // the recording never runs off into its paused tail: the film's loop pulls it back
  app.addEventListener('timeupdate', follow);

  const start = () => {
    if (reduceMotion) { app.currentTime = OFFSET; return; }
    Promise.all([film.play(), app.play()]).catch(() => {});
  };
  let ready = 0;
  const onReady = () => { if (++ready === 2) start(); };
  film.addEventListener('canplay', onReady, { once: true });
  app.addEventListener('canplay', onReady, { once: true });
})();
