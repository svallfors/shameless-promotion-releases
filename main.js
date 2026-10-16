// Shameless Promotion — the page's three behaviours (2026-09-17):
//  1. the eyes follow the cursor or a finger and drift with it (parallax by depth)
//  2. the app demo plays once in view (light or dark with the page); the clips
//     loop and float around it at their own depths
//  3. the download button reads the latest release from GitHub
'use strict';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. the eyes ---------- */
// They watch the cursor, rest looking in toward the page, blink now and then,
// shut while the privacy card is hovered and light up over Download
// (Hampus 2026-09-30). Every mood is a spring with a little overshoot, so one
// flows into the next from wherever it is, cartoon style.
(() => {
  const tpl = document.getElementById('eyes-template');
  const pairs = [...document.querySelectorAll('.eyes')];
  if (!tpl || !pairs.length) return;
  // the pupil's travel inside the egg, in the eye's own units: the pupil
  // may kiss the rim sideways (the icon's look) and has more room up and down
  const TRAVEL_X = 4.2, TRAVEL_Y = 6.2;
  // how far away (px) the cursor has to be for the pupil to reach the rim
  const REACH = 260;
  // an excited egg stretches up about this point (eye units)
  const PIVOT_X = 8.7, PIVOT_Y = 17;
  // the lids close like curtains: how far (eye units) the upper one travels
  // down from above the egg, and the lower one up from below it
  const UPPER_TRAVEL = 20, LOWER_TRAVEL = 13;
  // how much shut lids squash the egg's height
  const BLINK_SQUASH = 0.08;
  // the moods: how tall the eggs are, how big the pupils, how shut the lids
  // and how bright the glint
  const MOODS = {
    rest: { stretch: 1, pupil: 1, lid: 0, glint: 0, shake: 0 },
    shut: { stretch: 1, pupil: 1, lid: 1, glint: 0, shake: 0 },
    excited: { stretch: 1.1, pupil: 1.28, lid: 0, glint: 1, shake: 1 },
  };
  // the cursor right between a pair's eyes crosses them: small pupils pressed
  // together (Hampus 2026-09-30). The spot is a circle centred between the
  // eyes and a little low, sized to the pair's 40 px box: in within CROSS_IN,
  // out again past CROSS_OUT, so the edge doesn't flicker
  const CROSS_CY = 0.65, CROSS_IN = 0.4, CROSS_OUT = 0.5, CROSS_PUPIL = 0.4;
  // and the eggs lean out at the top (degrees) and slide together until they
  // touch a little below the equator (eye units), where the two pupils meet
  const CROSS_TILT = 8, CROSS_LOW = 2.6;
  // how far into its egg a crossed pupil sits from the touching point, in
  // pupil radii: under 1, so the two pupils just merge
  const CROSS_MEET = 0.85;
  // the egg's middle height (eye units)
  const EGG_MID = 14.85;
  // excited eyes tremble: a tiny, very fast shake (px, Hz)
  const SHAKE_PX = 0.7, SHAKE_HZ = 22;
  // a quick blink every 5-10 s: close, a beat shut, open (ms)
  const BLINK_CLOSE = 60, BLINK_HOLD = 40, BLINK_OPEN = 110;
  const BLINK_MS = BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN;
  const spring = (x, k, c) => ({ x, v: 0, t: x, k, c });
  // Where a pair's crossed eggs touch, worked out from the egg's own outline:
  // each egg turns CROSS_TILT about its middle, and the point on its inner
  // edge CROSS_LOW below the equator is where it meets its partner and where
  // the pupils meet. The eggs slide sideways until those points
  // meet; below them the outlines cross a little, drawn over both eggs. Everything lands on the eye in eye units, before
  // the egg's turn.
  function crossPose(path, [a, b]) {
    const n = 480, len = path.getTotalLength(), pts = [];
    for (let k = 0; k < n; k++) { const q = path.getPointAtLength((k / n) * len); pts.push([q.x, q.y]); }
    for (const e of [a, b]) {
      const m = e.eye.transform.baseVal.consolidate().matrix;
      // mirrored: toward the partner on screen is toward smaller x in eye
      // units for the left eye and larger x for the right one
      e.tilt = e.inward * CROSS_TILT;
      const t = (e.tilt * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t);
      const turn = ([x, y]) => [PIVOT_X + (x - PIVOT_X) * cos - (y - EGG_MID) * sin,
        EGG_MID + (x - PIVOT_X) * sin + (y - EGG_MID) * cos];
      let best = null, bestD = Infinity;
      for (const q of pts) {
        const [rx, ry] = turn(q);
        if (e.inward > 0 ? rx > PIVOT_X : rx < PIVOT_X) continue;
        const d = Math.abs(ry - EGG_MID - CROSS_LOW);
        if (d < bestD) { best = q; bestD = d; }
      }
      e.touch = best;
      e.touchX = m.e - turn(best)[0];
      // the pupil steps into its egg along the screen's horizontal, which in
      // the unturned egg is that line turned back by the tilt
      const d = e.inward * CROSS_MEET * e.rx * CROSS_PUPIL;
      e.crossPupil = [best[0] + d * cos, best[1] - d * sin];
    }
    const midX = (a.touchX + b.touchX) / 2;
    // back through the mirror: screen x flips
    for (const e of [a, b]) e.slide = -(midX - e.touchX);
  }
  const eyes = [];
  pairs.forEach((pair, i) => {
    const svg = tpl.content.firstElementChild.cloneNode(true);
    // one <defs> id per pair — the template's #egg would otherwise collide
    svg.querySelector('#egg').id = `egg-${i}`;
    svg.querySelector('#egg-clip').id = `egg-clip-${i}`;
    svg.querySelectorAll('use').forEach((u) => u.setAttribute('href', `#egg-${i}`));
    svg.querySelectorAll('[clip-path]').forEach((g) => g.setAttribute('clip-path', `url(#egg-clip-${i})`));
    pair.appendChild(svg);
    // the outlines ride on a layer above both eyes, so where crossed eggs
    // overlap both outlines show instead of one egg hiding the other's
    const rims = document.createElementNS(svg.namespaceURI, 'g');
    svg.appendChild(rims);
    const pairEyes = [];
    svg.querySelectorAll('.eye').forEach((eye, j) => {
      const pupil = eye.querySelector('.pupil');
      const rimEye = document.createElementNS(svg.namespaceURI, 'g');
      rimEye.setAttribute('transform', eye.getAttribute('transform'));
      const rimBody = document.createElementNS(svg.namespaceURI, 'g');
      rimBody.appendChild(eye.querySelector('.rim'));
      rimEye.appendChild(rimBody);
      rims.appendChild(rimEye);
      eyes.push({ pupil, pair, body: eye.querySelector('.body'), iris: eye.querySelector('.iris'),
        glint: eye.querySelector('.glint'), upper: eye.querySelector('.upper'), lower: eye.querySelector('.lid.lower'),
        cx: +pupil.getAttribute('cx'), cy: +pupil.getAttribute('cy'),
        rx: +pupil.getAttribute('rx'), ry: +pupil.getAttribute('ry'),
        // the eye group is mirrored (scale -1 1): a cursor to the RIGHT of
        // the eye must move the pupil to smaller x in eye units
        sign: -1, dx: 0, dy: 0, tx: 0, ty: 0,
        // the template's first eye sits on the left, its partner to the right
        inward: j === 0 ? 1 : -1, eye, rimBody });
      pairEyes.push(eyes[eyes.length - 1]);
    });
    crossPose(svg.querySelector(`#egg-${i}`), pairEyes);
    pair._depth = parseFloat(pair.dataset.depth) || 0;
    pair._px = 0; pair._py = 0; pair._tx = 0; pair._ty = 0;
    // loose enough to wobble past the target once, tight enough to feel snappy
    pair._stretch = spring(1, 340, 15);
    pair._pupil = spring(1, 300, 16);
    pair._lid = spring(0, 420, 24);
    pair._glint = spring(0, 260, 18);
    pair._shake = spring(0, 400, 40);
    pair._cross = spring(0, 320, 20);
    // each pair trembles out of step with the others
    pair._phase = i * 2.1;
    pair._hop = spring(0, 420, 18);
    pair._blink = -1;
  });

  let cursor = null;
  let mood = 'rest';
  let raf = 0;
  let last = 0;
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
  const step = (sp, dt) => {
    if (reduceMotion) { sp.x = sp.t; sp.v = 0; return false; }
    sp.v += (-sp.k * (sp.x - sp.t) - sp.c * sp.v) * dt;
    sp.x += sp.v * dt;
    if (Math.abs(sp.x - sp.t) < 0.0005 && Math.abs(sp.v) < 0.005) { sp.x = sp.t; sp.v = 0; return false; }
    return true;
  };
  // 0 open .. 1 shut, along the blink's close, hold and open
  const blinkAt = (ms) => {
    if (ms < BLINK_CLOSE) { const u = ms / BLINK_CLOSE; return u * u; }
    if (ms < BLINK_CLOSE + BLINK_HOLD) return 1;
    const u = Math.min(1, (ms - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN);
    return 1 - u * (2 - u);
  };
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(0.032, (now - last) / 1000) : 1 / 60;
    last = now;
    let moving = false;
    for (const pair of pairs) {
      pair._px += (pair._tx - pair._px) * 0.12;
      pair._py += (pair._ty - pair._py) * 0.12;
      if (Math.abs(pair._tx - pair._px) > 0.05 || Math.abs(pair._ty - pair._py) > 0.05) moving = true;
      if (step(pair._stretch, dt)) moving = true;
      if (step(pair._pupil, dt)) moving = true;
      if (step(pair._lid, dt)) moving = true;
      if (step(pair._glint, dt)) moving = true;
      if (step(pair._shake, dt)) moving = true;
      if (step(pair._cross, dt)) moving = true;
      let jx = 0, jy = 0;
      if (pair._shake.x > 0.001 && !reduceMotion) {
        const w = (now / 1000) * SHAKE_HZ * 2 * Math.PI + pair._phase;
        const a = SHAKE_PX * pair._shake.x;
        jx = a * Math.sin(w);
        jy = a * 0.6 * Math.sin(w * 1.37 + 1);
        moving = true;
      }
      if (step(pair._hop, dt)) moving = true;
      let b = 0;
      if (pair._blink >= 0) {
        const ms = now - pair._blink;
        if (ms >= BLINK_MS) pair._blink = -1; else { b = blinkAt(ms); moving = true; }
      }
      // the springs may overshoot; lids stop at open and shut
      pair._l = Math.min(1, Math.max(0, pair._lid.x, b));
      // closing lids squash the egg a touch, the cartoon blink
      pair._sy = pair._stretch.x * (1 - BLINK_SQUASH * pair._l);
      // a stretched egg is a touch narrower, a squashed one a touch wider
      pair._sx = 1 - (pair._sy - 1) * 0.3;
      pair.style.transform = `translate(${(pair._px + jx).toFixed(2)}px, ${(pair._py + pair._hop.x + jy).toFixed(2)}px)`;
    }
    for (const e of eyes) {
      const c = Math.min(1, Math.max(0, e.pair._cross.x));
      // ease toward the target; stop when settled
      e.dx += (e.tx - e.dx) * 0.18;
      e.dy += (e.ty - e.dy) * 0.18;
      if (Math.abs(e.tx - e.dx) > 0.01 || Math.abs(e.ty - e.dy) > 0.01) moving = true;
      // a crossed pupil shrinks
      const p = e.pair._pupil.x * (1 - (1 - CROSS_PUPIL) * c);
      // a bigger pupil has less room before it kisses the rim
      const kx = Math.max(0, TRAVEL_X - (p - 1) * e.rx) / TRAVEL_X;
      const ky = Math.max(0, TRAVEL_Y - (p - 1) * e.ry) / TRAVEL_Y;
      let px = e.cx + e.dx * e.sign * kx, py = e.cy + e.dy * ky;
      // crossed eyes look hard at each other instead of at the cursor
      px += (e.crossPupil[0] - px) * c;
      py += (e.crossPupil[1] - py) * c;
      e.iris.setAttribute('transform',
        `translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${p.toFixed(3)}) translate(${-e.cx} ${-e.cy})`);
      // the glint pops in from nothing at its own spot in the pupil
      const g = Math.max(0, e.pair._glint.x);
      e.glint.setAttribute('r', (1.35 * g).toFixed(2));
      const { _sx: sx, _sy: sy, _l: l } = e.pair;
      // crossed: the egg turns about its middle and slides to meet its partner (the eye group is mirrored, so a positive turn leans the
      // left eye's top to the left, away from its partner)
      e.body.setAttribute('transform', e.bodyT =
        `translate(${(e.slide * c).toFixed(2)} 0) rotate(${(e.tilt * c).toFixed(2)} ${PIVOT_X} ${EGG_MID}) translate(${PIVOT_X} ${PIVOT_Y}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-PIVOT_X} ${-PIVOT_Y})`);
      e.rimBody.setAttribute('transform', e.bodyT);
      e.upper.setAttribute('transform', `translate(0 ${(-(1 - l) * UPPER_TRAVEL).toFixed(2)})`);
      e.lower.setAttribute('transform', `translate(0 ${((1 - l) * LOWER_TRAVEL).toFixed(2)})`);
    }
    if (moving) raf = requestAnimationFrame(tick);
  }
  const aim = () => {
    if (!cursor) return;
    for (const pair of pairs) {
      const r = pair.getBoundingClientRect();
      const d = Math.hypot(cursor.x - (r.left + r.width / 2), cursor.y - (r.top + r.height * CROSS_CY)) / r.width;
      const crossed = pair._cross.t === 1 ? d < CROSS_OUT : d < CROSS_IN;
      pair._cross.t = crossed ? 1 : 0;
    }
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
    kick();
  };
  // at rest the eyes look in toward the page, pupils against the rim, the way
  // the app icon looks: a pair right of the column looks left, a pair left of
  // it looks right
  const rest = (now) => {
    for (const e of eyes) {
      const r = e.pair.getBoundingClientRect();
      e.tx = (r.left + r.width / 2 > innerWidth / 2 ? -1 : 1) * TRAVEL_X;
      e.ty = 0;
      if (now) { e.dx = e.tx; e.dy = e.ty; }
    }
    for (const pair of pairs) { pair._tx = 0; pair._ty = 0; pair._cross.t = 0; }
  };
  const feel = (next) => {
    if (next === mood) return;
    mood = next;
    for (const pair of pairs) {
      pair._stretch.t = MOODS[mood].stretch;
      pair._pupil.t = MOODS[mood].pupil;
      pair._lid.t = MOODS[mood].lid;
      pair._glint.t = MOODS[mood].glint;
      pair._shake.t = MOODS[mood].shake;
      // lighting up comes with a little hop
      if (mood === 'excited' && !reduceMotion) pair._hop.v -= 90;
    }
    kick();
  };
  const hoverMood = (el, m) => {
    if (!el) return;
    el.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') feel(m); });
    el.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse' && mood === m) feel('rest'); });
  };
  hoverMood(document.querySelector('.privacy'), 'shut');
  hoverMood(document.getElementById('download'), 'excited');
  // each pair blinks on its own clock; shut eyes skip their blink
  const blinkLater = (pair) => setTimeout(() => {
    if (mood !== 'shut' && !document.hidden) { pair._blink = performance.now(); kick(); }
    blinkLater(pair);
  }, 5000 + Math.random() * 5000);
  pairs.forEach(blinkLater);

  const look = (x, y) => { cursor = { x, y }; aim(); };
  addEventListener('pointermove', (ev) => look(ev.clientX, ev.clientY), { passive: true });
  addEventListener('pointerdown', (ev) => look(ev.clientX, ev.clientY), { passive: true });
  // a finger that scrolls the page cancels its pointer stream, so touches are
  // followed through the touch events, which keep coming while the page moves;
  // after the finger lifts, the eyes keep looking at its last spot
  const touch = (ev) => { const t = ev.touches[0]; if (t) look(t.clientX, t.clientY); };
  addEventListener('touchstart', touch, { passive: true });
  addEventListener('touchmove', touch, { passive: true });
  // the pupils keep looking at the cursor's last spot while the page scrolls
  addEventListener('scroll', aim, { passive: true });
  addEventListener('pointerleave', (ev) => {
    if (ev.pointerType && ev.pointerType !== 'mouse') return;
    cursor = null;
    rest();
    kick();
  });
  addEventListener('resize', () => { if (!cursor) { rest(); kick(); } });
  // the page opens with the eyes already at rest, no glance on load
  rest(true);
  kick();
})();

/* ---------- 2. the app demo and the clips ---------- */
(() => {
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const forced = document.documentElement.dataset.theme;
    return forced ? forced === 'dark' : darkQuery.matches;
  };
  const near = (el, fn, rootMargin = '200px') => {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { rootMargin });
    io.observe(el);
  };

  // THE APP: light or dark with the page; it plays once when half of it is
  // on screen, then holds its last frame and offers a replay. With reduced
  // motion it waits on its poster behind the same button.
  const demo = document.querySelector('.demo-video');
  const replay = document.querySelector('.demo-replay');
  if (demo && replay) {
    const scheme = () => (isDark() ? 'dark' : 'light');
    let shown = '';
    const dress = () => {
      const s = scheme();
      if (s === shown) return;
      shown = s;
      demo.poster = demo.dataset[`poster${s === 'dark' ? 'Dark' : 'Light'}`];
      if (demo.dataset.loaded) { demo.src = demo.dataset[s]; demo.load(); offerReplay(); }
    };
    const offerReplay = () => {
      replay.setAttribute('aria-label', demo.currentTime > 0 ? 'Replay' : 'Play');
      replay.hidden = false;
    };
    const playFromStart = () => {
      if (!demo.dataset.loaded) { demo.dataset.loaded = '1'; demo.src = demo.dataset[scheme()]; }
      replay.hidden = true;
      demo.currentTime = 0;
      demo.play().catch(offerReplay);
    };
    dress();
    demo.addEventListener('ended', offerReplay);
    replay.addEventListener('click', playFromStart);
    // a click on the finished film replays it too
    demo.addEventListener('click', () => { if (demo.ended || demo.paused) playFromStart(); });
    // fetch it as it nears the view - unless it already started: a second
    // src would restart the load and cut the play short (it then sat still)
    near(demo, () => {
      if (demo.dataset.loaded) return;
      demo.preload = 'auto'; demo.dataset.loaded = '1'; demo.src = demo.dataset[scheme()];
    });
    if (reduceMotion) offerReplay();
    else if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); playFromStart(); }
      }, { threshold: 0.5 });
      io.observe(demo);
    } else playFromStart();
    darkQuery.addEventListener('change', dress);
    new MutationObserver(dress).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // narrow windows put the films in a strip under the app (styles.css)
  const stripped = matchMedia('(max-width: 900px)');

  // THE CLIPS' WIDTH in the strip: as close to 600 px as fits while it shows
  // a whole number of clips plus 30% of the next - the peek says it scrolls
  const strip = document.querySelector('.clips');
  if (strip) {
    const fit = () => {
      if (!stripped.matches) return;
      const cs = getComputedStyle(strip);
      const gap = parseFloat(cs.columnGap) || 16;
      const view = strip.clientWidth - parseFloat(cs.paddingLeft); // to the window's edge
      const PEEK = 0.3, TARGET = 600;
      const n = Math.max(1, Math.round((view - PEEK * TARGET) / (TARGET + gap)));
      const w = (view - n * gap) / (n + PEEK);
      document.documentElement.style.setProperty('--clip-w', `${Math.floor(w)}px`);
    };
    fit();
    addEventListener('resize', fit);
    stripped.addEventListener('change', fit);
  }

  // THE FLOAT (Hampus 2026-10-16: "slight parallax"): around the app, each
  // film (and the eyes by its foot) moves with the page plus its own share of
  // the showcase's distance from the middle of the window - a film in front
  // runs a little ahead of the page, the one behind lags. The design's
  // picture is exact with the showcase centred on screen.
  const showcase = document.querySelector('.showcase');
  const floaters = showcase ? [...showcase.querySelectorAll('[data-scroll]')] : [];
  if (showcase && floaters.length && !reduceMotion) {
    for (const el of floaters) el._k = parseFloat(el.dataset.scroll) || 0;
    let queued = false;
    const drift = () => {
      queued = false;
      if (stripped.matches) { for (const el of floaters) el.style.translate = ''; return; }
      const r = showcase.getBoundingClientRect();
      const d = r.top + r.height / 2 - innerHeight / 2;
      for (const el of floaters) el.style.translate = `0 ${(d * el._k).toFixed(1)}px`;
    };
    const later = () => { if (!queued) { queued = true; requestAnimationFrame(drift); } };
    addEventListener('scroll', later, { passive: true });
    addEventListener('resize', later);
    stripped.addEventListener('change', later);
    drift();
  }

  // THE CLIPS: loaded as they near the view, looping while on screen. One
  // clip in view sets its own source before it plays: the nearing observer
  // and the on-screen one fire in no set order, and a clip that came on
  // screen before its source was set never played (Hampus 2026-10-16: "about
  // 2-3 play but not all 5") - with preload none nothing else would start it
  for (const v of document.querySelectorAll('.clip video')) {
    const load = () => {
      if (v.getAttribute('src')) return;
      v.src = v.dataset.src;
      if (reduceMotion) v.controls = true;
    };
    near(v, load);
    if (reduceMotion || !('IntersectionObserver' in window)) continue;
    new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { load(); v.play().catch(() => {}); } else v.pause();
      }
    }, { threshold: 0.25 }).observe(v);
  }
})();

/* ---------- 2b. an enlarged film ---------- */
// A click on a film enlarges it (Hampus 2026-10-16): a copy grows out of the
// film's own spot to the middle of the screen over a veil that blurs the page,
// picking up where the film was; a click anywhere or Esc sends it back the
// same way and hands the film its place in the loop. Keyboard: the films are
// buttons, Enter or Space opens one.
(() => {
  const films = [...document.querySelectorAll('.clip')];
  if (!films.length) return;
  const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  const OPEN_MS = 460, CLOSE_MS = 380;
  const RADIUS = 12; // the film's corners in place (styles.css .clip video)
  const CAPTION = 'Demo saved in 720p, Low quality. You can export up to 4K at 60 fps in the app.';
  let open = null;

  // the transform that puts the copy (at its centred size) over the film
  const over = (from, to) => {
    const s = from.width / to.width;
    return { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${s})`, borderRadius: `${RADIUS / s}px` };
  };

  const expand = (fig) => {
    if (open) return;
    const src = fig.querySelector('video');
    if (!src.getAttribute('src')) src.src = src.dataset.src;
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.tabIndex = -1;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Example film');
    const veil = document.createElement('div');
    veil.className = 'lightbox-veil';
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true;
    v.poster = src.poster;
    v.src = src.currentSrc || src.src;
    v.addEventListener('loadedmetadata', () => { v.currentTime = src.currentTime; }, { once: true });
    // what the film is, under it (Hampus 2026-10-16): it comes in once the
    // film has landed and leaves first on the way back
    const film = document.createElement('div');
    film.className = 'lightbox-film';
    const cap = document.createElement('p');
    cap.className = 'lightbox-cap';
    cap.textContent = CAPTION;
    film.append(v, cap);
    lb.append(veil, film);
    document.body.append(lb);
    document.documentElement.classList.add('lightbox-open');
    if (!reduceMotion) v.play().catch(() => {});
    const radius = getComputedStyle(v).borderRadius;
    const from = src.getBoundingClientRect(), to = v.getBoundingClientRect();
    src.style.visibility = 'hidden';
    if (!reduceMotion) {
      v.animate([over(from, to), { transform: 'none', borderRadius: radius }], { duration: OPEN_MS, easing: EASE });
      veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS * 0.8, easing: 'ease-out' });
      cap.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
        { duration: 240, delay: OPEN_MS * 0.75, easing: 'ease-out', fill: 'backwards' });
    }
    lb.focus({ preventScroll: true });
    open = { fig, src, lb, v, veil, cap, closing: false };
  };

  const collapse = () => {
    if (!open || open.closing) return;
    open.closing = true;
    const { fig, src, lb, v, veil, cap } = open;
    const done = () => {
      if (v.readyState >= 1) src.currentTime = v.currentTime;
      src.style.visibility = '';
      lb.remove();
      document.documentElement.classList.remove('lightbox-open');
      fig.focus({ preventScroll: true });
      open = null;
    };
    if (reduceMotion) { done(); return; }
    const to = v.getBoundingClientRect();
    const radius = getComputedStyle(v).borderRadius;
    const back = v.animate([{ transform: 'none', borderRadius: radius }, over(src.getBoundingClientRect(), to)],
      { duration: CLOSE_MS, easing: EASE, fill: 'forwards' });
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS, easing: 'ease-in', fill: 'forwards' });
    cap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in', fill: 'forwards' });
    back.finished.then(done, done);
  };

  for (const fig of films) {
    fig.tabIndex = 0;
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', 'Enlarge film');
    fig.addEventListener('click', () => expand(fig));
    fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expand(fig); }
    });
  }
  document.addEventListener('click', (e) => { if (open && open.lb.contains(e.target)) collapse(); });
  // Esc closes; so do Enter and Space on the open film (not the key press
  // that opened it, which bubbles up from the film's button)
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape' || ((e.key === 'Enter' || e.key === ' ') && open.lb.contains(e.target))) { e.preventDefault(); collapse(); }
  });
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
