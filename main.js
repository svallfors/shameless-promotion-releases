// Shameless Promotion — the page's three behaviours (2026-09-17):
//  1. the eyes follow the cursor and drift with it (parallax by depth)
//  2. the films load lazily, one set for light and one for dark
//  3. the download button reads the latest release from GitHub
'use strict';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => {
  const forced = document.documentElement.dataset.theme;
  return forced ? forced === 'dark' : darkQuery.matches;
};

/* ---------- 1. the eyes ---------- */
(() => {
  const tpl = document.getElementById('eyes-template');
  const pairs = [...document.querySelectorAll('.eyes')];
  if (!tpl || !pairs.length) return;
  // the pupil's travel inside the egg, in the eye's own units: the pupil
  // may kiss the rim sideways (the icon's look) and has more room up and down
  const TRAVEL_X = 4.2, TRAVEL_Y = 6.2;
  // how far away (px) the cursor has to be for the pupil to reach the rim
  const REACH = 260;
  const eyes = [];
  pairs.forEach((pair, i) => {
    const svg = tpl.content.firstElementChild.cloneNode(true);
    // one <defs> id per pair — the template's #egg would otherwise collide
    const egg = svg.querySelector('#egg');
    egg.id = `egg-${i}`;
    svg.querySelectorAll('use').forEach((u) => u.setAttribute('href', `#egg-${i}`));
    pair.appendChild(svg);
    svg.querySelectorAll('.pupil').forEach((pupil) => {
      eyes.push({ pupil, pair, cx: +pupil.getAttribute('cx'), cy: +pupil.getAttribute('cy'),
        // the eye group is mirrored (scale -1 1): a cursor to the RIGHT of
        // the eye must move the pupil to smaller x in eye units
        sign: -1, dx: 0, dy: 0, tx: 0, ty: 0 });
    });
    pair._depth = parseFloat(pair.dataset.depth) || 0;
    pair._px = 0; pair._py = 0; pair._tx = 0; pair._ty = 0;
  });

  let cursor = null;
  let raf = 0;
  const tick = () => {
    raf = 0;
    let moving = false;
    for (const e of eyes) {
      // ease toward the target; stop when settled
      e.dx += (e.tx - e.dx) * 0.18;
      e.dy += (e.ty - e.dy) * 0.18;
      if (Math.abs(e.tx - e.dx) > 0.01 || Math.abs(e.ty - e.dy) > 0.01) moving = true;
      e.pupil.setAttribute('transform', `translate(${(e.dx * e.sign).toFixed(2)} ${e.dy.toFixed(2)})`);
    }
    for (const pair of pairs) {
      pair._px += (pair._tx - pair._px) * 0.12;
      pair._py += (pair._ty - pair._py) * 0.12;
      if (Math.abs(pair._tx - pair._px) > 0.05 || Math.abs(pair._ty - pair._py) > 0.05) moving = true;
      pair.style.transform = `translate(${pair._px.toFixed(1)}px, ${pair._py.toFixed(1)}px)`;
    }
    if (moving) raf = requestAnimationFrame(tick);
  };
  const aim = () => {
    if (!cursor) return;
    for (const e of eyes) {
      const r = e.pupil.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const vx = cursor.x - ex, vy = cursor.y - ey;
      const dist = Math.hypot(vx, vy) || 1;
      const k = Math.min(1, dist / REACH);
      e.tx = (vx / dist) * k * TRAVEL_X;
      e.ty = (vy / dist) * k * TRAVEL_Y;
    }
    if (!reduceMotion) {
      const mx = cursor.x - innerWidth / 2, my = cursor.y - innerHeight / 2;
      for (const pair of pairs) { pair._tx = mx * pair._depth; pair._ty = my * pair._depth; }
    }
    if (!raf) raf = requestAnimationFrame(tick);
  };
  addEventListener('pointermove', (ev) => {
    if (ev.pointerType && ev.pointerType !== 'mouse') return;
    cursor = { x: ev.clientX, y: ev.clientY };
    aim();
  }, { passive: true });
  // the pupils keep looking at the cursor's last spot while the page scrolls
  addEventListener('scroll', aim, { passive: true });
  addEventListener('pointerleave', () => {
    cursor = null;
    for (const e of eyes) { e.tx = 0; e.ty = 0; }
    for (const pair of pairs) { pair._tx = 0; pair._ty = 0; }
    if (!raf) raf = requestAnimationFrame(tick);
  });
})();

/* ---------- 2. the films ---------- */
(() => {
  const videos = [...document.querySelectorAll('.film video')];
  if (!videos.length) return;
  const srcFor = (v) => (isDark() ? v.dataset.dark : v.dataset.light);
  // the still behind each film follows the scheme as well
  const dress = (v) => {
    const poster = isDark() ? (v.dataset.posterDark || v.dataset.posterLight) : (v.dataset.posterLight || v.dataset.posterDark);
    if (poster) v.poster = poster; else v.removeAttribute('poster');
  };
  videos.forEach(dress);
  const load = (v) => {
    const src = srcFor(v);
    if (!src || v.dataset.loaded === src) return;
    v.dataset.loaded = src;
    v.src = src;
    v.load();
    // no such file yet: fall back to the poster (or the plain tile) quietly
    v.onerror = () => { v.removeAttribute('src'); v.dataset.loaded = ''; };
    v.oncanplay = () => { if (!reduceMotion) v.play().catch(() => {}); };
  };
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        for (const en of entries) if (en.isIntersecting) { load(en.target); io.unobserve(en.target); }
      }, { rootMargin: '200px' })
    : null;
  videos.forEach((v) => (io ? io.observe(v) : load(v)));
  // the scheme flips while the page is open: swap the set
  darkQuery.addEventListener('change', () => videos.forEach((v) => { dress(v); if (v.dataset.loaded) load(v); }));
})();

/* ---------- 3. the download button ---------- */
(async () => {
  const btn = document.getElementById('download');
  if (!btn) return;
  try {
    const r = await fetch('https://api.github.com/repos/svallfors/shameless-promotion-releases/releases/latest',
      { headers: { accept: 'application/vnd.github+json' } });
    if (!r.ok) return;
    const rel = await r.json();
    const dmg = (rel.assets || []).find((a) => /\.dmg$/i.test(a.name));
    if (dmg) btn.href = dmg.browser_download_url;
    const v = String(rel.tag_name || '').replace(/^v/, '');
    // the version rides after the note; the plugin link stays a link
    const ver = document.getElementById('cta-version');
    if (v && ver) ver.textContent = ` · ${v}`;
  } catch { /* the button already links to the releases page */ }
})();
