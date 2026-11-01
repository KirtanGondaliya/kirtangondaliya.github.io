/* ============================================================
   HERO FIELD — a small "system" drawn on canvas.
   Labelled services sit on the right, a drift of anonymous nodes fills
   the rest; packets travel along the wires with a short comet trail.
   The cursor pulls nearby nodes toward it and lights their wires.
   ============================================================ */
(() => {
  const canvas = document.querySelector('.hero__canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SERVICES = ['react', 'typescript', 'node.js', 'express', 'prisma', 'postgresql', 'mongodb', 'tailwind'];
  let W = 0, H = 0, dpr = 1, nodes = [], edges = [], packets = [];
  let line = '182,243,107', ink = '238,241,244';
  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  let running = false, raf = 0, t0 = performance.now();

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    line = cs.getPropertyValue('--canvas-line').trim() || line;
    ink = cs.getPropertyValue('--canvas-node').trim() || ink;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function build() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    nodes = [];
    const wide = W > 820;
    // Named services: a loose cluster on the right (or spread top on mobile).
    SERVICES.forEach((name, i) => {
      const a = (i / SERVICES.length) * Math.PI * 2 + rand(-.25, .25);
      const r = wide ? Math.min(W, H) * rand(.15, .25) : Math.min(W, H) * rand(.18, .36);
      const cx = wide ? W * .78 : W * .5;
      const cy = wide ? H * .48 : H * .78;
      nodes.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * .8, name, r: 3.2 });
    });
    // Anonymous drift.
    const count = Math.round(Math.min(70, (W * H) / 16000));
    for (let i = 0; i < count; i++) nodes.push({ x: rand(0, W), y: rand(0, H), r: rand(.8, 1.8) });
    nodes.forEach(n => { n.ox = n.x; n.oy = n.y; n.ph = rand(0, Math.PI * 2); n.sp = rand(.2, .6); });

    // Wires: each node to its 2 nearest; services to 2-3 other services.
    const key = new Set(); edges = [];
    const add = (a, b) => { const k = a < b ? a + '-' + b : b + '-' + a; if (a !== b && !key.has(k)) { key.add(k); edges.push([a, b]); } };
    nodes.forEach((n, i) => {
      const near = nodes.map((m, j) => [j, (m.x - n.x) ** 2 + (m.y - n.y) ** 2]).sort((p, q) => p[1] - q[1]);
      const k = n.name ? 3 : 2;
      let added = 0;
      for (const [j, d] of near) {
        if (j === i) continue;
        if (!n.name && d > (Math.min(W, H) * .22) ** 2) break;
        add(i, j); if (++added >= k) break;
      }
    });
    // react + tailwind → express on node.js → prisma → postgresql / mongodb.
    const ring = [0, 1, 0, 7, 0, 3, 1, 2, 2, 3, 3, 4, 4, 5, 3, 6, 1, 3];
    for (let i = 0; i < ring.length - 1; i += 2) add(ring[i], ring[i + 1]);

    packets = [];
    for (let i = 0; i < Math.round(edges.length * .18); i++) spawn(true);
  }

  function spawn(randomPos) {
    // Prefer service-to-service wires so the cluster looks busy.
    const pool = Math.random() < .6 ? edges.filter(([a, b]) => nodes[a].name || nodes[b].name) : edges;
    const e = pool[(Math.random() * pool.length) | 0];
    if (!e) return;
    const flip = Math.random() < .5;
    packets.push({ a: flip ? e[1] : e[0], b: flip ? e[0] : e[1], p: randomPos ? Math.random() : 0, v: rand(.004, .011) });
  }

  // Keep the left (text) side readable.
  function fade(x, y) {
    const wide = W > 820;
    if (!wide) return .32;
    const fx = Math.min(1, Math.max(.12, (x - W * .28) / (W * .32)));
    return fx;
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    pointer.x += (pointer.tx - pointer.x) * .08;
    pointer.y += (pointer.ty - pointer.y) * .08;

    // Drift + pointer lens.
    for (const n of nodes) {
      const dx = n.ox + Math.cos(t * n.sp + n.ph) * 6;
      const dy = n.oy + Math.sin(t * n.sp * 1.3 + n.ph) * 6;
      const px = pointer.x - dx, py = pointer.y - dy, d2 = px * px + py * py, R = 170;
      const pull = d2 < R * R ? (1 - Math.sqrt(d2) / R) * .22 : 0;
      n.x = dx + px * pull; n.y = dy + py * pull;
      n.glow = d2 < R * R ? 1 - Math.sqrt(d2) / R : 0;
    }

    // Wires.
    for (const [ai, bi] of edges) {
      const a = nodes[ai], b = nodes[bi];
      const f = Math.min(fade(a.x, a.y), fade(b.x, b.y));
      const g = Math.max(a.glow, b.glow);
      const svc = a.name && b.name;
      ctx.strokeStyle = `rgba(${g > .05 || svc ? line : ink},${(svc ? .22 : .07) * f + g * .35})`;
      ctx.lineWidth = svc ? 1 : .7;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Packets with comet trail.
    for (let i = packets.length - 1; i >= 0; i--) {
      const k = packets[i];
      k.p += k.v;
      if (k.p >= 1) { packets.splice(i, 1); spawn(false); continue; }
      const a = nodes[k.a], b = nodes[k.b];
      const f = Math.min(fade(a.x, a.y), fade(b.x, b.y));
      const x = a.x + (b.x - a.x) * k.p, y = a.y + (b.y - a.y) * k.p;
      const tp = Math.max(0, k.p - .16);
      const tx = a.x + (b.x - a.x) * tp, ty = a.y + (b.y - a.y) * tp;
      const grad = ctx.createLinearGradient(tx, ty, x, y);
      grad.addColorStop(0, `rgba(${line},0)`);
      grad.addColorStop(1, `rgba(${line},${.85 * f})`);
      ctx.strokeStyle = grad; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = `rgba(${line},${f})`;
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // Nodes + service labels.
    ctx.font = '500 11px "Geist Mono", ui-monospace, monospace';
    for (const n of nodes) {
      const f = fade(n.x, n.y);
      if (n.name) {
        ctx.fillStyle = `rgba(${line},${.25 * f + n.glow * .3})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, 9 + n.glow * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${line},${Math.max(.5, f)})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${ink},${.55 * f + n.glow * .4})`;
        if (W > 820) ctx.fillText(n.name, n.x + 13, n.y + 4);
      } else {
        ctx.fillStyle = `rgba(${n.glow > .05 ? line : ink},${.28 * f + n.glow * .6})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    if (running && !reduce) raf = requestAnimationFrame(frame);
  }

  function start() { if (running) return; running = true; t0 = performance.now() - 1000; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  readColors();
  build();
  frame(performance.now());
  requestAnimationFrame(() => canvas.classList.add('is-on'));
  if (!reduce) {
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    canvas.parentElement.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = e.clientX - r.left; pointer.ty = e.clientY - r.top;
      if (pointer.x < -999) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    });
    canvas.parentElement.addEventListener('pointerleave', () => { pointer.tx = pointer.ty = -9999; });
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduce) frame(performance.now()); }, 150); });
  document.addEventListener('themechange', () => { readColors(); if (reduce || !running) frame(performance.now()); });
})();
