/*
  scottcollins.uk

  1. Contact panel (scottcollins.uk/#contact opens it directly)
  2. Contact form, sent in the background with a normal submit as fallback
  3. Music, played while the contact panel is open
  4. The production line animation

  No innerHTML, eval or inline handlers anywhere, so the CSP and
  Trusted Types rules in _headers never need loosening.
*/

(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));


  /* 1. Contact panel ---------------------------------------------------- */

  const dialog = byId('contact');
  const openLink = byId('open-contact');
  const closeLink = byId('close-contact');

  if (dialog && openLink && closeLink && typeof dialog.showModal === 'function') {
    const open = (withMusic) => {
      if (!dialog.open) dialog.showModal();
      if (withMusic) startMusic();
    };

    openLink.addEventListener('click', (event) => {
      event.preventDefault();
      open(true);
    });

    closeLink.addEventListener('click', (event) => {
      event.preventDefault();
      dialog.close();
    });

    // A click on the dimmed backdrop lands on the <dialog> itself
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener('close', () => {
      stopMusic();
      if (location.hash === '#contact') {
        history.replaceState(null, '', location.pathname + location.search);
      }
    });

    if (location.hash === '#contact') open(false);

    window.addEventListener('hashchange', () => {
      if (location.hash === '#contact') open(false);
    });
  }


  /* 2. Contact form ----------------------------------------------------- */

  const form = byId('contact-form');
  const status = byId('form-status');

  if (form && status && 'fetch' in window) {
    const sendBtn = form.querySelector('.send');
    const fieldNames = { topic: 'Topic', name: 'Name', email: 'Email', message: 'Message' };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      sendBtn.disabled = true;
      status.textContent = 'Sending…';

      let response;

      try {
        response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
      } catch {
        // Offline or blocked: let the browser do a normal submit instead
        form.submit();
        return;
      }

      if (response.ok) {
        form.reset();
        status.textContent = 'Message sent. I’ll reply by email.';
        sendBtn.disabled = false;
        return;
      }

      const data = await response.json().catch(() => ({}));
      const fieldErrors = (data.errors || []).filter((e) => e.field);

      if (fieldErrors.length) {
        status.textContent = fieldErrors
          .map((e) => `${fieldNames[e.field] || e.field} ${e.message}.`)
          .join(' ');
        sendBtn.disabled = false;
        return;
      }

      // Anything else (CAPTCHA, rate limit): Formspree's own page takes over
      form.submit();
    });
  }


  /* 3. Music ------------------------------------------------------------ */
  /* Plays while the contact panel is open; the toggle sits in the panel. */

  const audio = byId('site-audio');
  const musicBtn = byId('music');
  let musicMuted = false;   // the visitor switched it off, so don't restart it

  function startMusic() {
    if (!audio || musicMuted) return;
    const attempt = audio.play();
    if (attempt) attempt.catch(() => {});
  }

  function stopMusic() {
    if (audio && !audio.paused) audio.pause();
  }

  if (audio && musicBtn) {
    const show = (on) => musicBtn.setAttribute('aria-pressed', String(on));

    musicBtn.addEventListener('click', () => {
      if (audio.paused) {
        musicMuted = false;
        startMusic();
      } else {
        musicMuted = true;
        audio.pause();
      }
    });

    audio.addEventListener('play', () => show(true));
    audio.addEventListener('pause', () => show(false));
  }


  /* 4. The production line ---------------------------------------------- */
  /*
     Three stations on one conveyor, always busy:
       left    a part is drawn as a CAD model
       middle  a robot sweeps a line scanner along it and maps the deviation;
               every so often a part fails
       right   a handling robot sets a bracket on each flange and two robots
               join them: rivets, spot welds, or adhesive put on the brackets
               while they're held up. Click the robots to switch process.
               A part that failed gets a red cross and passes straight through.
     Every P seconds the whole line moves on one station, like a transfer line.
     The 404 page shows only the conveyor, with a red cross on it.
  */

  const canvas = byId('line');

  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const params = new URLSearchParams(location.search);
    const freezeParam = params.get('t');   // ?t=2.5 holds one moment (for screenshots)
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stopped = document.body.dataset.line === 'stopped';

    const P = 5.8, T = 1.5, C = P + T;
    let GAP = 340;   // distance between stations (closer on phones)
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const lerp = (a, b, t) => a + (b - a) * t;
    const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

    // Camera: orthographic, turned so the line rises to the right, looking down
    const TH = -20 * Math.PI / 180, PH = 35 * Math.PI / 180;
    const cT = Math.cos(TH), sT = Math.sin(TH), cP = Math.cos(PH), sP = Math.sin(PH);
    const VIEW = [sT * cP, cT * cP, sP];   // towards the camera

    let W = 0, H = 0, S = 1, CX = 0, CY = 0, DPR = 1;
    const pr = (p) => [CX + (p[0] * cT - p[1] * sT) * S, CY + ((p[0] * sT + p[1] * cT) * sP - p[2] * cP) * S];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const unit = (v) => { const m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; };
    const LIGHT = unit([-0.5, 0.5, 0.9]);

    const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    const lit = (c, n, amb = 0.55) => { const k = amb + (1 - amb) * Math.max(0, dot(n, LIGHT)); return [c[0] * k, c[1] * k, c[2] * k]; };

    const STEEL = [184, 190, 199], CADC = [118, 154, 196], CYAN = [125, 211, 252], EDGE = [38, 41, 47], RED = [239, 68, 68];
    const CMAP = [[59, 130, 246], [20, 184, 166], [34, 197, 94], [34, 197, 94], [163, 230, 53], [250, 204, 21], [249, 115, 22]];
    const cmap = (v) => { v = clamp(v) * (CMAP.length - 1); const i = Math.min(CMAP.length - 2, Math.floor(v)); return mix(CMAP[i], CMAP[i + 1], v - i); };
    const dev = (x, f) => 0.5 + 0.22 * Math.sin(x * 0.045 + f * 1.7) + 0.13 * Math.sin(x * 0.11 + f * 0.6 + 1);
    // A failed part has one patch well out of tolerance
    const inspectColour = (x, f, bad) => (bad && Math.abs(x - 28) < 14 && f >= 3 ? RED : cmap(dev(x, f)));

    const poly = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
    const line = (a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    const disc = (p, r) => { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); };

    /* The part: a pressed hat section on a flat plate, like a body-in-white rail */
    const HL = 80, BX = 84, BY = 52, BZ = 3, FZ = BZ + 0.5;
    const PROF = [[-46, FZ], [-28, FZ], [-19, 30], [19, 30], [28, FZ], [46, FZ]];
    const NSL = 12;

    const quad = (x0, x1, a, b, n, fid) => {
      const slices = [];
      for (let i = 0; i < NSL; i++) {
        const xa = lerp(x0, x1, i / NSL), xb = lerp(x0, x1, (i + 1) / NSL);
        slices.push({ pts: [[xa, a[0], a[1]], [xb, a[0], a[1]], [xb, b[0], b[1]], [xa, b[0], b[1]]], xc: (xa + xb) / 2 });
      }
      return { slices, outline: [[x0, a[0], a[1]], [x1, a[0], a[1]], [x1, b[0], b[1]], [x0, b[0], b[1]]], n, fid };
    };
    const single = (pts, n, fid, hollow) => ({ slices: [{ pts, xc: pts[0][0] }], outline: pts, n, fid, hollow });

    const hat = PROF.slice(0, -1).map((a, i) => {
      const b = PROF[i + 1];
      return quad(-HL, HL, a, b, unit([0, -(b[1] - a[1]), b[0] - a[0]]), 3 + i);
    });

    // Painter's order; faces turned away from the camera are skipped when drawn.
    // Index 4 is the back flange: anything sitting on it is drawn straight after.
    const FACES = [
      quad(-BX, BX, [-BY, BZ], [BY, BZ], [0, 0, 1], 0),
      quad(-BX, BX, [BY, 0], [BY, BZ], [0, 1, 0], 1),
      single([[BX, -BY, 0], [BX, BY, 0], [BX, BY, BZ], [BX, -BY, BZ]], [1, 0, 0], 2),
      single([[-BX, BY, 0], [-BX, -BY, 0], [-BX, -BY, BZ], [-BX, BY, BZ]], [-1, 0, 0], 2),
      hat[0], hat[1], hat[2],
      single([[HL, -28, FZ], [HL, -19, 30], [HL, 19, 30], [HL, 28, FZ]], [1, 0, 0], 9, true),
      single([[-HL, 28, FZ], [-HL, 19, 30], [-HL, -19, 30], [-HL, -28, FZ]], [-1, 0, 0], 9, true),
      hat[3], hat[4]
    ];

    // Wireframe edges, in the order they get drawn
    const EDGES = [];
    [[-BX, -BY, BX, -BY], [BX, -BY, BX, BY], [BX, BY, -BX, BY], [-BX, BY, -BX, -BY]]
      .forEach(([a, b, c, d]) => EDGES.push([[a, b, BZ], [c, d, BZ]]));
    [[-BX, -BY], [BX, -BY], [BX, BY], [-BX, BY]]
      .forEach(([x, y]) => EDGES.push([[x, y, BZ], [x, y, 0]]));
    [[-BX, BY, BX, BY], [-BX, -BY, -BX, BY]]
      .forEach(([a, b, c, d]) => EDGES.push([[a, b, 0], [c, d, 0]]));
    PROF.forEach(([y, z]) => EDGES.push([[-HL, y, z], [HL, y, z]]));
    [-HL, HL].forEach((x) => PROF.slice(0, -1).forEach(([y, z], i) => EDGES.push([[x, y, z], [x, PROF[i + 1][0], PROF[i + 1][1]]])));

    // Every seventh part fails inspection (the first about twenty seconds in)
    const rejected = (id) => ((id % 7) + 7) % 7 === 2;

    function drawPart(st) {
      const X = st.X;
      const at = (p) => pr([p[0] + X, p[1], p[2]]);

      if (st.solid > 0) {
        ctx.save();
        ctx.globalAlpha = st.solid * 0.6;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 16 * S * DPR;
        ctx.shadowOffsetY = 4 * S * DPR;
        poly([[-BX, -BY, 0], [BX, -BY, 0], [BX, BY, 0], [-BX, BY, 0]].map(at));
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fill();
        ctx.restore();
      }

      if (st.wire > 0 && st.solid < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - st.solid;
        ctx.strokeStyle = ctx.fillStyle = rgba(CYAN);
        ctx.lineWidth = Math.max(1, 1.3 * S);
        ctx.lineCap = 'round';
        const f = st.wire * EDGES.length, full = Math.floor(f);
        let pen = null;
        for (let i = 0; i < Math.min(full + 1, EDGES.length); i++) {
          const k = i < full ? 1 : f - full;
          if (k <= 0) continue;
          const [a, b] = EDGES[i];
          const A = at(a), B = at(lerp3(a, b, k));
          line(A, B);
          disc(A, Math.max(1.2, 1.8 * S));
          if (i === full) pen = B;
        }
        if (pen && st.wire < 1) {
          ctx.globalAlpha = 0.25 * (1 - st.solid);
          disc(pen, 9 * S);
          ctx.globalAlpha = 1 - st.solid;
          ctx.fillStyle = '#e0f2fe';
          disc(pen, 2.6 * S);
        }
        ctx.restore();
      }

      if (st.solid > 0) {
        ctx.save();
        ctx.globalAlpha = st.solid;
        ctx.lineJoin = 'round';
        FACES.forEach((f, fi) => {
          if (dot(f.n, VIEW) > 0) {
            for (const s of f.slices) {
              let c;
              if (f.hollow) {
                c = [20, 21, 25];
              } else {
                c = mix(STEEL, CADC, st.cad);
                if (st.scanAmt > 0 && s.xc < st.scan) c = mix(c, inspectColour(s.xc, f.fid, st.bad), st.scanAmt * 0.92);
                c = lit(c, f.n);
              }
              poly(s.pts.map(at));
              ctx.fillStyle = ctx.strokeStyle = rgba(c);
              ctx.lineWidth = 0.7;
              ctx.fill();
              ctx.stroke();
            }
            poly(f.outline.map(at));
            ctx.strokeStyle = rgba(mix(CYAN, EDGE, st.edgeDark), 0.95);
            ctx.lineWidth = Math.max(0.8, 1.1 * S);
            ctx.stroke();
          }
          if (fi === 4 && st.inner) st.inner();
        });
        ctx.restore();
      }
    }

    /* Station 1: CAD workplane and axis triad */
    function drawGrid(X, a) {
      ctx.save();
      ctx.lineWidth = 1;
      for (let x = -120; x <= 120; x += 20) {
        ctx.strokeStyle = rgba(CYAN, (Math.abs(x) === 120 ? 0.35 : 0.13) * a);
        line(pr([X + x, -80, 0.3]), pr([X + x, 80, 0.3]));
      }
      for (let y = -80; y <= 80; y += 20) {
        ctx.strokeStyle = rgba(CYAN, (Math.abs(y) === 80 ? 0.35 : 0.13) * a);
        line(pr([X - 120, y, 0.3]), pr([X + 120, y, 0.3]));
      }
      ctx.restore();
    }

    function drawTriad(X, a) {
      if (a <= 0) return;
      const o = [X - BX - 14, -BY - 14, 0.3];
      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineWidth = Math.max(1.4, 2 * S);
      ctx.lineCap = 'round';
      [[[30, 0, 0], '#f87171'], [[0, 30, 0], '#4ade80'], [[0, 0, 30], '#60a5fa']].forEach(([d, col]) => {
        ctx.strokeStyle = ctx.fillStyle = col;
        const e = pr([o[0] + d[0], o[1] + d[1], o[2] + d[2]]);
        line(pr(o), e);
        disc(e, 2.4 * S);
      });
      ctx.fillStyle = '#e4e4e7';
      disc(pr(o), 2.6 * S);
      ctx.restore();
    }

    /* Boxes and cylinders for the machines */
    function box(x0, x1, y0, y1, z0, z1, col) {
      const face = (pts, n) => {
        if (dot(n, VIEW) <= 0) return;
        poly(pts.map(pr));
        ctx.fillStyle = rgba(lit(col, n, 0.5));
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.stroke();
      };
      face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0]);
      face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0]);
      face([[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], [-1, 0, 0]);
      face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]);
    }

    function cylinder(x, y, z0, z1, r, col) {
      const ring = (z) => Array.from({ length: 28 }, (_, i) => {
        const a = i / 28 * Math.PI * 2;
        return pr([x + r * Math.cos(a), y + r * Math.sin(a), z]);
      });
      const b = ring(z0), t = ring(z1);
      let lo = 0, hi = 0;
      b.forEach((p, i) => { if (p[0] < b[lo][0]) lo = i; if (p[0] > b[hi][0]) hi = i; });
      ctx.fillStyle = rgba(lit(col, [0, 1, 0], 0.5));
      poly(b); ctx.fill();
      poly([b[lo], b[hi], t[hi], t[lo]]); ctx.fill();
      ctx.fillStyle = rgba(lit(col, [0, 0, 1], 0.5));
      poly(t); ctx.fill();
    }

    /* The conveyor */
    function drawConveyor(off) {
      const X0 = -1600, X1 = 1600, BW = 62, BT = 14;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 40 * S * DPR;
      poly([[X0, -BW, -100], [X1, -BW, -100], [X1, BW + 10, -100], [X0, BW + 10, -100]].map(pr));
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();
      ctx.restore();

      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#1c1d21';
      ctx.lineWidth = 5 * S;
      for (let x = -1500; x <= 1500; x += 300) line(pr([x, -BW + 6, -BT]), pr([x, -BW + 6, -100]));

      poly([[X0, -BW, 0], [X1, -BW, 0], [X1, BW, 0], [X0, BW, 0]].map(pr));
      ctx.fillStyle = '#222328';
      ctx.fill();

      const step = 34, o = ((off % step) + step) % step;
      ctx.strokeStyle = 'rgba(255,255,255,0.045)';
      ctx.lineWidth = Math.max(1, 1.2 * S);
      for (let x = X0 + o; x < X1; x += step) line(pr([x, -BW, 0]), pr([x, BW, 0]));

      ctx.strokeStyle = '#33353b';
      ctx.lineWidth = 1.5;
      line(pr([X0, -BW, 0]), pr([X1, -BW, 0]));

      poly([[X0, BW, 0], [X1, BW, 0], [X1, BW, -BT], [X0, BW, -BT]].map(pr));
      ctx.fillStyle = '#17181b';
      ctx.fill();
      ctx.strokeStyle = '#3b3d43';
      line(pr([X0, BW, 0]), pr([X1, BW, 0]));

      ctx.strokeStyle = '#1f2024';
      ctx.lineWidth = 5 * S;
      for (let x = -1500; x <= 1500; x += 300) line(pr([x, BW - 6, -BT]), pr([x, BW - 6, -100]));
    }

    /* Robots: a pedestal, a turret, two links and whatever tool they carry */
    const BIG = { rb: 18, top: 30, sh: 54, l1: 128, l2: 118, k: 1 };
    const SMALL = { rb: 14, top: 26, sh: 46, l1: 96, l2: 90, k: 0.8 };   // the handling robot
    const RB = BIG.rb;
    const ORANGE = { dark: '#9a3412', a: '#ea580c', b: '#f97316', c: '#fb923c', turret: [234, 88, 12] };
    const GREY = { dark: '#3a3d44', a: '#7c828b', b: '#959ba4', c: '#a9aeb6', turret: [128, 134, 143] };

    function drawBase(bx, by, pal, d = BIG) {
      box(bx - d.rb, bx + d.rb, by - d.rb, by + d.rb, -100, 8, [42, 44, 49]);
      cylinder(bx, by, 8, d.top, d.rb + 2, pal.turret);
    }

    function limb(a, b, wd, dark, light) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = dark;
      ctx.lineWidth = wd * S;
      line(a, b);
      ctx.strokeStyle = light;
      ctx.lineWidth = (wd - 4) * S;
      line(a, b);
    }

    function joint(p, r) {
      ctx.fillStyle = '#26272b';
      disc(p, r * S);
      ctx.strokeStyle = '#5b5d64';
      ctx.lineWidth = Math.max(1, 1.3 * S);
      ctx.beginPath();
      ctx.arc(p[0], p[1], r * S, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Two links from the shoulder to the wrist, elbow up; returns the screen points
    function arm(bx, by, wr, pal, m = BIG) {
      const J = [bx, by, m.sh];
      const dx = wr[0] - J[0], dy = wr[1] - J[1], dz = wr[2] - J[2];
      const rr = Math.hypot(dx, dy) || 0.001, ux = dx / rr, uy = dy / rr;
      const d = Math.min(Math.hypot(rr, dz), m.l1 + m.l2 - 0.5);
      const a = Math.atan2(dz, rr) + Math.acos(clamp((m.l1 * m.l1 + d * d - m.l2 * m.l2) / (2 * m.l1 * d), -1, 1));
      const E = [J[0] + ux * m.l1 * Math.cos(a), J[1] + uy * m.l1 * Math.cos(a), J[2] + m.l1 * Math.sin(a)];
      const j = pr(J), e = pr(E), w = pr(wr);
      limb(pr([bx, by, m.top]), j, 18 * m.k, pal.dark, pal.a);
      limb(j, e, 16 * m.k, pal.dark, pal.b);
      limb(e, w, 13 * m.k, pal.dark, pal.c);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      return { j, e, w, k: m.k };
    }
    const joints = (pts) => { joint(pts.j, 8 * pts.k); joint(pts.e, 6.5 * pts.k); joint(pts.w, 5 * pts.k); };

    /* Station 2: a robot sweeps a line scanner along the part */
    const QBX = -80, QBY = -130, SCAN_A = -80, SCAN_B = 80, SCANZ = 64, QTL = 13;
    const SCAN0 = 0.1, SCAN1 = 0.85;   // the laser is on between these points of the cycle

    function scanTip(tc, X) {
      const A = [X + SCAN_A, 0, SCANZ], B = [X + SCAN_B, 0, SCANZ];
      const Aup = [A[0], 0, SCANZ + 30], Bup = [B[0], 0, SCANZ + 30];
      if (tc >= P) return lerp3(Bup, Aup, ease((tc - P) / T));   // back to the start while the line moves
      const p = tc / P;
      if (p < SCAN0) return lerp3(Aup, A, ease(p / SCAN0));
      if (p < SCAN1) return lerp3(A, B, (p - SCAN0) / (SCAN1 - SCAN0));
      return lerp3(B, Bup, ease(seg(p, SCAN1, SCAN1 + 0.08)));
    }

    function drawScanner(X, tip, laser) {
      const [tx, ty, tz] = tip;
      if (laser) {
        const lx = tx - X;
        let prof;
        if (Math.abs(lx) <= HL) prof = [[-BY, BZ], [-46, FZ], ...PROF, [BY, BZ]];
        else if (Math.abs(lx) <= BX) prof = [[-BY, BZ], [BY, BZ]];
        else prof = [[-56, 0.3], [56, 0.3]];
        const hit = prof.map(([y, z]) => pr([tx, y, z]));
        ctx.save();
        ctx.fillStyle = 'rgba(34,211,238,0.06)';
        poly([pr([tx, ty - 46, tz]), pr([tx, ty + 46, tz]), hit[hit.length - 1], hit[0]]);
        ctx.fill();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const trace = () => { ctx.beginPath(); hit.forEach((h, i) => (i ? ctx.lineTo(h[0], h[1]) : ctx.moveTo(h[0], h[1]))); ctx.stroke(); };
        ctx.strokeStyle = 'rgba(34,211,238,0.3)';
        ctx.lineWidth = 4 * S;
        trace();
        ctx.strokeStyle = '#a5f3fc';
        ctx.lineWidth = Math.max(1.2, 1.5 * S);
        trace();
        ctx.restore();
      }
      // The scanner: one slim bar across the part
      box(tx - 4, tx + 4, ty - 50, ty + 50, tz, tz + 7, [60, 63, 70]);
      if (laser) {
        ctx.strokeStyle = 'rgba(165,243,252,0.9)';
        ctx.lineWidth = Math.max(1, 1.3 * S);
        line(pr([tx, ty - 46, tz]), pr([tx, ty + 46, tz]));
      }
      const pts = arm(X + QBX, QBY, [tx, ty, tz + QTL], GREY);
      ctx.strokeStyle = '#2f3237';
      ctx.lineWidth = 6 * S;
      line(pr([tx, ty, tz + 7]), pts.w);
      joints(pts);
    }

    /* Station 3: a handling robot loads two brackets, two robots join them */
    const PROCESSES = [
      { id: 'spr', name: 'self-piercing rivets' },
      { id: 'rsw', name: 'spot welding' },
      { id: 'glue', name: 'adhesive' }
    ];
    // ?p=rsw or ?p=glue starts on another process (used for screenshots)
    const startProc = Math.max(0, PROCESSES.findIndex((x) => x.id === params.get('p')));
    let joinIdx = startProc, nextIdx = startProc;
    const joinId = () => PROCESSES[joinIdx].id;

    const BK = 56, BTK = 3, LIP = 14, BCOL = [112, 124, 140];
    const JX = [45, 27, 9, -9, -27, -45];
    const FRONT = JX.map((x) => [x, 37, FZ + BTK]);
    const BACK = FRONT.map(([x, y, z]) => [-x, -y, z]);
    const RBX = 115, RBY = 86;
    const ROBOTS = [
      { side: -1, joints: BACK, home: (X) => [X - 15, -72, 96] },
      { side: 1, joints: FRONT, home: (X) => [X + 15, 72, 96] }
    ];
    const TOOL = [0, 0, 28];   // from the tool tip up to the wrist

    // Rivets and spot welds: the brackets go down first, then the joints
    const J0 = 1.5, JW0 = 0.45, WSTEP = 0.5, WDOWN = 0.1, WDWELL = 0.16;
    const jointTime = (k) => J0 + JW0 + k * WSTEP + WDOWN;
    const JOIN_END = J0 + JW0 + JX.length * WSTEP;
    const joinsDone = (u) => clamp(Math.floor((u - J0 - JW0 - WDOWN) / WSTEP) + 1, 0, JX.length);
    // Adhesive: the brackets are held up and the robots bead their undersides
    const G_HOLD = 40;
    const GL = { in0: 1.0, in1: 1.2, a: 1.35, b: 3.35, out0: 3.5, out1: 3.85 };

    function joinerPose(u, X, r, id) {
      const home = r.home(X);
      if (id === 'glue') {
        const s = r.side, z = G_HOLD - 0.8, ang = [0, s * 20, -16];   // nozzle pointing up and in
        const A = [X + s * 40, s * 38, z], B = [X - s * 40, s * 38, z];
        const outA = [A[0], s * 64, z - 8], outB = [B[0], s * 64, z - 8];
        if (u < GL.in0 || u >= GL.out1) return { tip: home, tv: TOOL };
        if (u < GL.in1) { const f = ease((u - GL.in0) / (GL.in1 - GL.in0)); return { tip: lerp3(home, outA, f), tv: lerp3(TOOL, ang, f) }; }
        if (u < GL.a) return { tip: lerp3(outA, A, ease((u - GL.in1) / (GL.a - GL.in1))), tv: ang };
        if (u < GL.b) return { tip: lerp3(A, B, (u - GL.a) / (GL.b - GL.a)), tv: ang };
        if (u < GL.out0) return { tip: lerp3(B, outB, ease((u - GL.b) / (GL.out0 - GL.b))), tv: ang };
        const f = ease((u - GL.out0) / (GL.out1 - GL.out0));
        return { tip: lerp3(outB, home, f), tv: lerp3(ang, TOOL, f) };
      }
      const pose = (tip) => ({ tip, tv: TOOL });
      const wp = r.joints.map((w) => [X + w[0], w[1], w[2]]);
      const up = (p, h = 16) => [p[0], p[1], p[2] + h];
      if (u < J0) return pose(home);
      if (u < J0 + JW0) return pose(lerp3(home, up(wp[0]), ease((u - J0) / JW0)));
      for (let k = 0; k < wp.length; k++) {
        const s0 = J0 + JW0 + k * WSTEP;
        if (u < s0 + WDOWN) return pose(lerp3(up(wp[k]), wp[k], ease(clamp((u - s0) / WDOWN))));
        if (u < s0 + WDOWN + WDWELL) {
          const press = id === 'spr' ? 2.2 * Math.sin(Math.PI * (u - s0 - WDOWN) / WDWELL) : 0;
          return pose([wp[k][0], wp[k][1], wp[k][2] - press]);
        }
        if (u < s0 + WSTEP) {
          const next = k < wp.length - 1 ? up(wp[k + 1]) : up(wp[k]);
          const f = (u - s0 - WDOWN - WDWELL) / (WSTEP - WDOWN - WDWELL);
          return pose(f < 0.3 ? lerp3(wp[k], up(wp[k]), ease(f / 0.3)) : lerp3(up(wp[k]), next, ease((f - 0.3) / 0.7)));
        }
      }
      return pose(lerp3(up(wp[wp.length - 1]), home, ease(clamp((u - JOIN_END) / 0.6))));
    }

    function drawJoiner(X, pose, r, id) {
      const { tip, tv } = pose;
      const pts = arm(X + r.side * RBX, r.side * RBY, add3(tip, tv), ORANGE);
      const { w } = pts, t = pr(tip);
      if (id === 'spr') {
        // C-frame rivet gun: punch above, frame round the outside of the bracket
        const y = tip[1] + r.side * 21, top = tip[2] + 20, low = tip[2] - 10;
        const frame = [[tip[0], tip[1], top], [tip[0], y, top], [tip[0], y, low], [tip[0], tip[1] + r.side * 12, low]].map(pr);
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 5 * S;
        ctx.beginPath();
        frame.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
        ctx.strokeStyle = '#52525b'; ctx.lineWidth = 8 * S; line(w, t);
        ctx.strokeStyle = '#a1a1aa'; ctx.lineWidth = 3 * S; line([lerp(t[0], w[0], 0.2), lerp(t[1], w[1], 0.2)], t);
      } else if (id === 'glue') {
        const mid = [lerp(w[0], t[0], 0.55), lerp(w[1], t[1], 0.55)];
        ctx.strokeStyle = '#3f3f46'; ctx.lineWidth = 7 * S; line(w, mid);
        ctx.strokeStyle = '#a1a1aa'; ctx.lineWidth = 2.2 * S; line(mid, t);
      } else {
        ctx.strokeStyle = '#3f3f46'; ctx.lineWidth = 6 * S; line(w, t);
        ctx.strokeStyle = '#71717a'; ctx.lineWidth = 2.5 * S; line([lerp(t[0], w[0], 0.15), lerp(t[1], w[1], 0.15)], t);
      }
      joints(pts);
    }

    // An L-shaped bracket: a plate on the flange and a short upstand on the outside edge.
    // y0 is the centre line of the pair (0 on the part).
    function drawBracket(X, y0, side, z) {
      const yIn = y0 + side * 30, yOut = y0 + side * 44, yLip = y0 + side * 47;
      const plate = () => box(X - BK, X + BK, Math.min(yIn, yOut), Math.max(yIn, yOut), z, z + BTK, BCOL);
      const lip = () => box(X - BK, X + BK, Math.min(yOut, yLip), Math.max(yOut, yLip), z, z + LIP, BCOL);
      if (side > 0) { plate(); lip(); } else { lip(); plate(); }
    }

    // Joints on the front bracket (the back one is hidden behind the part anyway)
    function drawJoins(X, n, id) {
      for (let k = 0; k < n; k++) {
        const p = pr([X + JX[k], 37, FZ + BTK]);
        const oval = (dx, dy, rx, ry, fill) => {
          ctx.fillStyle = fill;
          ctx.beginPath(); ctx.ellipse(p[0] + dx * S, p[1] + dy * S, rx * S, ry * S, -0.2, 0, Math.PI * 2); ctx.fill();
        };
        if (id === 'rsw') {
          oval(0, 0, 3.6, 2.3, 'rgb(70,72,79)');
          oval(0, 0, 1.9, 1.2, 'rgba(176,132,84,0.9)');
        } else {
          oval(0, 0.3, 3.9, 2.5, '#4b4f57');
          oval(0, -0.2, 3.1, 1.95, '#d4d6db');
          oval(-0.9, -0.8, 1.1, 0.65, 'rgba(255,255,255,0.85)');
        }
      }
    }

    // Adhesive squeezed out along the edge of the front bracket as it's pressed down
    function drawSqueeze(X, k) {
      if (k <= 0) return;
      const a = pr([X + 52, 47.8, FZ + 0.6]), b = pr([X - 52, 47.8, FZ + 0.6]);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#17191d';
      ctx.lineWidth = Math.max(1.4, 2.6 * S) * k;
      line(a, b);
      ctx.strokeStyle = `rgba(255,255,255,${0.22 * k})`;
      ctx.lineWidth = Math.max(0.6, 0.8 * S);
      line([a[0], a[1] - 0.7 * S], [b[0], b[1] - 0.7 * S]);
      ctx.restore();
    }

    function drawJoinFx(u, X, r, id) {
      if (id === 'glue') return;
      r.joints.forEach((wp, k) => {
        const ts = u - jointTime(k);
        if (ts < 0 || ts > 0.45) return;
        const p = pr([X + wp[0], wp[1], wp[2]]);
        if (id === 'spr') {
          if (ts > 0.25) return;
          const f = ts / 0.25;
          ctx.strokeStyle = `rgba(228,228,231,${0.75 * (1 - f)})`;
          ctx.lineWidth = Math.max(1, 1.5 * S);
          ctx.beginPath();
          ctx.ellipse(p[0], p[1], (4 + 16 * f) * S, (2.6 + 10 * f) * S, -0.2, 0, Math.PI * 2);
          ctx.stroke();
          return;
        }
        const g = ts < WDWELL ? 1 : Math.max(0, 1 - (ts - WDWELL) / 0.12);
        if (g > 0) {
          const R = 26 * S;
          const glow = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R);
          glow.addColorStop(0, `rgba(255,255,255,${g})`);
          glow.addColorStop(0.25, `rgba(253,186,116,${0.85 * g})`);
          glow.addColorStop(1, 'rgba(251,146,60,0)');
          ctx.fillStyle = glow;
          disc(p, R);
        }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, 1.3 * S);
        for (let j = 0; j < 14; j++) {
          const seed = k * 31 + j + (r.side > 0 ? 0 : 500);
          const life = 0.25 + 0.2 * rnd(seed);
          if (ts > life) continue;
          const ang = -Math.PI * (0.08 + 0.84 * rnd(seed * 3 + 1));
          const v = (90 + 170 * rnd(seed * 7 + 2)) * S;
          const vx = Math.cos(ang) * v, vy = Math.sin(ang) * v, gy = 900 * S;
          const x = p[0] + vx * ts, y = p[1] + vy * ts + 0.5 * gy * ts * ts;
          ctx.strokeStyle = `rgba(253,224,71,${1 - ts / life})`;
          line([x, y], [x - vx * 0.03, y - (vy + gy * ts) * 0.03]);
        }
        ctx.restore();
      });
    }

    /* The handling robot: smaller, behind the line on the right, with its bracket rack */
    const LBX = 135, LBY = -84, TRX = 92, TRY = -186;
    const NSTACK = 2, PITCH = 4, RACKZ = 3, STACK_TOP = RACKZ + (NSTACK - 1) * PITCH;
    const GTL = 40;   // gripper, from the bottom of the brackets up to the wrist
    // Moves as [time, where, holding brackets?]; each cycle starts and ends over the rack
    const LOAD = {
      bolt: {
        keys: [[0, 'rackUp', 1], [0.6, 'above', 1], [1.05, 'place', 1], [1.15, 'place', 0], [1.5, 'above', 0],
          [2.1, 'rackUp', 0], [2.4, 'rack', 0], [2.5, 'rack', 1], [2.85, 'rackUp', 1]],
        release: 1.15, grip: 2.5
      },
      glue: {
        keys: [[0, 'rackUp', 1], [0.8, 'hold', 1], [3.85, 'hold', 1], [4.3, 'place', 1], [4.4, 'place', 0],
          [4.75, 'hold', 0], [5.35, 'rackUp', 0], [5.6, 'rack', 0], [5.7, 'rack', 1], [6.05, 'rackUp', 1]],
        release: 4.4, grip: 5.7
      },
      // A failed part gets nothing: the robot keeps its brackets and waits
      skip: { keys: [[0, 'rackUp', 1]], release: Infinity, grip: Infinity }
    };

    function loaderPose(tc, X, plan) {
      const spot = {
        above: [X, 0, G_HOLD], place: [X, 0, FZ], hold: [X, 0, G_HOLD],
        rack: [X + TRX, TRY, STACK_TOP], rackUp: [X + TRX, TRY, STACK_TOP + 22]
      };
      const k = plan.keys;
      let i = 0;
      while (i < k.length - 1 && tc >= k[i + 1][0]) i++;
      const holding = k[i][2] === 1;
      if (i === k.length - 1) return { tip: spot[k[i][1]], holding };
      const f = ease((tc - k[i][0]) / (k[i + 1][0] - k[i][0]));
      return { tip: lerp3(spot[k[i][1]], spot[k[i + 1][1]], f), holding };
    }

    function drawRack(X, tc, plan) {
      const cx = X + TRX;
      box(cx - 9, cx + 9, TRY - 9, TRY + 9, -100, -4, [34, 36, 40]);
      box(cx - 60, cx + 60, TRY - 52, TRY + 52, -4, RACKZ, [44, 46, 52]);
      // After a pick the stack lifts one step, so the rack never runs out
      const picked = tc >= plan.grip;
      const rise = picked ? ease(seg(tc, plan.grip + 0.1, plan.grip + 0.5)) : 0;
      const layers = picked ? [{ z: RACKZ + (rise - 1) * PITCH, a: rise }] : [];
      for (let k = 0; k < (picked ? NSTACK - 1 : NSTACK); k++) layers.push({ z: RACKZ + (k + rise) * PITCH, a: 1 });
      [-1, 1].forEach((side) => layers.forEach((l) => {
        if (l.a <= 0) return;
        ctx.save();
        ctx.globalAlpha = l.a;
        drawBracket(cx, TRY, side, l.z);
        ctx.restore();
      }));
    }

    // The gripper: a finger on each bracket's outer edge, joined by a bar over the top
    const GRIP = [70, 74, 82];
    const gripBack = (t) => box(t[0] - 6, t[0] + 6, t[1] - 52, t[1] - 47, t[2] + 9, t[2] + 28, GRIP);
    function gripFront(t) {
      box(t[0] - 6, t[0] + 6, t[1] - 52, t[1] + 52, t[2] + 28, t[2] + 32, GRIP);
      box(t[0] - 4, t[0] + 4, t[1] - 4, t[1] + 4, t[2] + 32, t[2] + GTL, [96, 100, 108]);
      box(t[0] - 6, t[0] + 6, t[1] + 47, t[1] + 52, t[2] + 9, t[2] + 28, GRIP);
    }
    function drawGripper(L) {
      gripBack(L.tip);
      if (L.holding) {
        drawBracket(L.tip[0], L.tip[1], -1, L.tip[2]);
        drawBracket(L.tip[0], L.tip[1], 1, L.tip[2]);
      }
      gripFront(L.tip);
    }

    // A failed part gets a red cross over it at the manufacturing station
    function drawCross(X, k) {
      if (k <= 0) return;
      const c = pr([X, 0, 62]), r = Math.max(7, 11 * S);
      const f1 = clamp(k * 2), f2 = clamp(k * 2 - 1);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = Math.max(2.5, 4.2 * S);
      line([c[0] - r, c[1] - r], [c[0] - r + 2 * r * f1, c[1] - r + 2 * r * f1]);
      if (f2 > 0) line([c[0] + r, c[1] - r], [c[0] + r - 2 * r * f2, c[1] - r + 2 * r * f2]);
      ctx.restore();
    }

    // The 404 page: a cross painted on the belt
    function drawBeltCross(X, k) {
      const R = 46, z = 0.4;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(239,68,68,0.9)';
      ctx.lineWidth = Math.max(6, 11 * S);
      [[[-R, -R], [R, R]], [[-R, R], [R, -R]]].forEach(([a, b], i) => {
        const f = clamp(k * 2 - i);
        if (f <= 0) return;
        line(pr([X + a[0], a[1], z]), pr([X + lerp(a[0], b[0], f), lerp(a[1], b[1], f), z]));
      });
      ctx.restore();
    }

    /* Stage names: shown when a station is hovered (or tapped on a phone) */
    const labelA = [0, 0, 0];
    const stationX = (i) => (i - 1) * GAP;
    const touchUI = window.matchMedia('(hover: none)').matches;
    const labelText = (i) => {
      if (i === 0) return ['Design'];
      if (i === 1) return ['Quality'];
      const hint = nextIdx !== joinIdx ? 'Next part: ' + PROCESSES[nextIdx].name
        : touchUI ? 'Tap to change process' : 'Click to change process';
      return ['Manufacturing: ' + PROCESSES[joinIdx].name, hint];
    };

    function drawLabels() {
      ctx.save();
      const size = Math.max(12, 13 * Math.min(S, 1.1));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        const a = labelA[i];
        if (a < 0.01) continue;
        const lines = labelText(i);
        ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        let w = ctx.measureText(lines[0]).width;
        if (lines[1]) {
          ctx.font = `400 ${size - 1}px system-ui, -apple-system, "Segoe UI", sans-serif`;
          w = Math.max(w, ctx.measureText(lines[1]).width);
        }
        w += 26;
        const h = lines[1] ? size * 2 + 20 : 28, r = 14;
        const [x0, y0] = pr([stationX(i), 0, 55]);
        const x = clamp(x0, w / 2 + 8, W - w / 2 - 8);
        const y = y0 - h - 6 + 6 * (1 - a);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(x - w / 2 + r, y);
        ctx.arcTo(x + w / 2, y, x + w / 2, y + h, r);
        ctx.arcTo(x + w / 2, y + h, x - w / 2, y + h, r);
        ctx.arcTo(x - w / 2, y + h, x - w / 2, y, r);
        ctx.arcTo(x - w / 2, y, x + w / 2, y, r);
        ctx.closePath();
        ctx.fillStyle = 'rgba(20,21,24,0.92)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        ctx.fillStyle = '#e4e4e7';
        if (lines[1]) {
          ctx.fillText(lines[0], x, y + 10 + size / 2);
          ctx.font = `400 ${size - 1}px system-ui, -apple-system, "Segoe UI", sans-serif`;
          ctx.fillStyle = '#a1a1aa';
          ctx.fillText(lines[1], x, y + 12 + size * 1.5);
        } else {
          ctx.fillText(lines[0], x, y + h / 2 + 0.5);
        }
      }
      ctx.restore();
    }

    /* One frame of the line at time t (seconds of line time) */
    let lastCycle = null;
    const procById = new Map();   // which process each part was joined with
    const procOf = (id) => PROCESSES[procById.has(id) ? procById.get(id) : joinIdx].id;

    // A finished part (or a failed one) on its way out to the right
    function drawDone(X, id) {
      if (pr([X - BX, -BY, 0])[0] > W + 20) return;
      const bad = rejected(id), pid = procOf(id);
      drawPart({ X, wire: 1, solid: 1, cad: 0, edgeDark: 1, scanAmt: bad ? 1 : 0, scan: 1e9, bad,
        inner: bad ? null : () => drawBracket(X, 0, -1, FZ) });
      if (bad) { drawCross(X, 1); return; }
      drawBracket(X, 0, 1, FZ);
      if (pid === 'glue') drawSqueeze(X, 1); else drawJoins(X, JX.length, pid);
    }

    function draw(t) {
      const n = Math.floor(t / C), tc = t - n * C;
      if (n !== lastCycle) {
        if (lastCycle === null) for (let k = 3; k <= 6; k++) procById.set(n - k, joinIdx);
        lastCycle = n;
        joinIdx = nextIdx;   // a new process starts with the next part
        procById.set(n - 2, joinIdx);
        procById.delete(n - 9);
      }
      const proc = tc < P, u = Math.min(tc, P), p = u / P;
      const q = proc ? 0 : ease((tc - P) / T);
      const X1 = -GAP, X2 = 0, X3 = GAP;
      const id = joinId(), idC = n - 2, badC = rejected(idC);
      const plan = badC ? LOAD.skip : id === 'glue' ? LOAD.glue : LOAD.bolt;
      const L = loaderPose(tc, X3, plan);
      const back = ROBOTS[0], front = ROBOTS[1];
      const working = proc && !badC;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Behind the line
      drawBase(X3 + back.side * RBX, back.side * RBY, ORANGE);
      drawBase(X2 + QBX, QBY, GREY);
      drawBase(X3 + LBX, LBY, GREY, SMALL);
      drawRack(X3, tc, plan);
      drawConveyor((n + q) * GAP);

      const grid = proc ? Math.min(seg(p, 0, 0.08), 1 - seg(p, 0.86, 1)) : 0;
      if (grid > 0) drawGrid(X1, grid);

      // Finished parts carry on to the right until they're off the screen
      for (let k = 3; k >= (proc ? 1 : 0); k--) drawDone(X3 + (k + q) * GAP, idC - k);

      // Station 1: drawn as a CAD model, then on to inspection
      drawPart(proc
        ? { X: X1, wire: seg(p, 0.04, 0.5), solid: seg(p, 0.46, 0.7), cad: 1, edgeDark: seg(p, 0.55, 0.78), scanAmt: 0, scan: -1e9 }
        : { X: lerp(X1, X2, q), wire: 1, solid: 1, cad: 1 - q, edgeDark: 1, scanAmt: 0, scan: -1e9 });

      // Station 2: scanned; a failed part keeps its colour map as it moves on
      const badB = rejected(n - 1);
      const sTip = scanTip(tc, X2);
      const scan = !proc ? 1e9 : p < SCAN0 ? -1e9 : p > SCAN1 ? 1e9 : sTip[0] - X2;
      drawPart(proc
        ? { X: X2, wire: 1, solid: 1, cad: 0, edgeDark: 1, scanAmt: 1, scan, bad: badB }
        : { X: lerp(X2, X3, q), wire: 1, solid: 1, cad: 0, edgeDark: 1, scanAmt: badB ? 1 : 1 - q, scan: 1e9, bad: badB });
      drawScanner(X2, sTip, proc && p > SCAN0 && p < SCAN1);

      // Station 3. The robot behind the line goes first, so the part hides it.
      drawJoiner(X3, working ? joinerPose(u, X3, back, id) : { tip: back.home(X3), tv: TOOL }, back, id);
      if (working) drawJoinFx(u, X3, back, id);

      const over = proc && Math.abs(L.tip[0] - X3) < 30 && Math.abs(L.tip[1]) < 30;
      if (proc) {
        const placed = tc >= plan.release;
        drawPart({
          X: X3, wire: 1, solid: 1, cad: 0, edgeDark: 1, scanAmt: badC ? 1 : 0, scan: 1e9, bad: badC,
          inner: () => {
            if (over) gripBack(L.tip);
            if (placed) drawBracket(X3, 0, -1, FZ);
            if (over && L.holding) drawBracket(L.tip[0], L.tip[1], -1, L.tip[2]);
          }
        });
        if (placed) {
          drawBracket(X3, 0, 1, FZ);
          if (id !== 'glue') drawJoins(X3, joinsDone(u), id);
        }
        if (over && L.holding) drawBracket(L.tip[0], L.tip[1], 1, L.tip[2]);
        if (id === 'glue' && !badC) drawSqueeze(X3, seg(tc, 4.2, 4.4));
        if (badC) drawCross(X3, seg(tc, 0.1, 0.4));
      }
      if (over) gripFront(L.tip); else drawGripper(L);
      joints(arm(X3 + LBX, LBY, add3(L.tip, [0, 0, GTL]), GREY, SMALL));

      // In front of the line
      drawBase(X3 + front.side * RBX, front.side * RBY, ORANGE);
      drawJoiner(X3, working ? joinerPose(u, X3, front, id) : { tip: front.home(X3), tv: TOOL }, front, id);
      if (working) drawJoinFx(u, X3, front, id);

      if (proc) drawTriad(X1, Math.min(seg(p, 0.05, 0.15), 1 - seg(p, 0.82, 0.95)));
      drawLabels();
    }

    // The 404 page: only the conveyor, under the middle of the screen
    function drawStopped(k) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawConveyor(0);
      drawBeltCross((W / 2 - CX) / (cT * S), k);
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      GAP = W < 700 ? 250 : 340;

      // Fit the stations, the robots and the rack to the screen width
      const xs = [];
      [-1, 1].forEach((a) => [-1, 1].forEach((b) => {
        xs.push([-GAP + a * BX, b * BY], [GAP + a * BX, b * BY]);
        xs.push([GAP + RBX + a * RB, RBY + b * RB], [GAP + LBX + a * SMALL.rb, LBY + b * SMALL.rb]);
        xs.push([GAP + TRX + a * 60, TRY + b * 52], [QBX + a * RB, QBY + b * RB]);
      }));
      const sx = xs.map(([x, y]) => x * cT - y * sT);
      const lo = Math.min(...sx), hi = Math.max(...sx);
      S = Math.min(1.4, (W - 32) / (hi - lo));
      CY = H * (W < 700 ? 0.55 : 0.56);
      // On short screens, keep the robots' arms clear of the text above
      const intro = document.querySelector('.intro');
      if (intro) {
        const room = CY - intro.getBoundingClientRect().bottom - 12;
        S = Math.max(0.35, Math.min(S, room / 190, (CY - 8) / 310));
      }
      CX = W / 2 - ((lo + hi) / 2) * S;
    }

    resize();

    if (stopped) {
      let t0 = null;
      const paint = (ms) => {
        if (t0 === null) t0 = ms;
        const k = still ? 1 : seg((ms - t0) / 1000, 0.3, 1);
        drawStopped(k);
        if (k < 1) requestAnimationFrame(paint);
      };
      window.addEventListener('resize', () => { resize(); drawStopped(1); });
      requestAnimationFrame(paint);
    } else if (freezeParam !== null || still) {
      const t = freezeParam !== null ? parseFloat(freezeParam) || 0 : 0.62 * P;
      draw(t);
      window.addEventListener('resize', () => { resize(); draw(t); });
    } else {
      let lineT = 0, last = null;

      // Where the pointer is, for the station labels
      const pointer = { x: -1e4, y: -1e4, touch: false, until: 0 };
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        pointer.x = e.clientX; pointer.y = e.clientY; pointer.touch = false;
      }, { passive: true });
      window.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        pointer.x = e.clientX; pointer.y = e.clientY; pointer.touch = true;
        pointer.until = performance.now() / 1000 + 2.5;
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', () => { pointer.x = -1e4; });

      // The robot cell is wider than the part, so its hover area is too
      const overStation = (i, x, y) => {
        const c = pr([stationX(i), 0, i === 2 ? 30 : 15]);
        const wx = i === 2 ? 160 : 110, wy = i === 2 ? 110 : 75;
        return Math.abs(x - c[0]) < wx * S && Math.abs(y - c[1]) < wy * S;
      };
      let cursorOn = false;

      // Click (or tap) the robots to switch joining process; it starts with the next part
      window.addEventListener('click', (e) => {
        if (dialog && dialog.open) return;
        if (e.target.closest && e.target.closest('a, button, input, textarea, label, dialog')) return;
        if (overStation(2, e.clientX, e.clientY)) nextIdx = (nextIdx + 1) % PROCESSES.length;
      });

      const frame = (ms) => {
        const now = ms / 1000;
        const dt = last === null ? 0 : Math.min(now - last, 0.1);
        last = now;
        lineT += dt;

        if (pointer.touch && now > pointer.until) pointer.x = -1e4;
        for (let i = 0; i < 3; i++) {
          const over = overStation(i, pointer.x, pointer.y);
          labelA[i] += ((over ? 1 : 0) - labelA[i]) * 0.15;
        }
        const pointing = !pointer.touch && overStation(2, pointer.x, pointer.y);
        if (pointing !== cursorOn) {
          cursorOn = pointing;
          document.body.style.cursor = pointing ? 'pointer' : '';
        }

        draw(lineT);
        requestAnimationFrame(frame);
      };

      window.addEventListener('resize', resize);
      requestAnimationFrame(frame);
    }
  }
})();
