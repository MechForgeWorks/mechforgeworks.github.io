/*
  scottcollins.uk

  1. Contact panel (scottcollins.uk/#contact opens it directly)
  2. Contact form, sent in the background with a normal submit as fallback
  3. Music toggle
  4. The production line animation

  No innerHTML, eval or inline handlers anywhere, so the CSP and
  Trusted Types rules in _headers never need loosening.
*/

(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);


  /* 1. Contact panel ---------------------------------------------------- */

  const dialog = byId('contact');
  const openLink = byId('open-contact');
  const closeLink = byId('close-contact');

  if (dialog && openLink && closeLink && typeof dialog.showModal === 'function') {
    const open = () => {
      if (!dialog.open) dialog.showModal();
    };

    openLink.addEventListener('click', (event) => {
      event.preventDefault();
      open();
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
      if (location.hash === '#contact') {
        history.replaceState(null, '', location.pathname + location.search);
      }
    });

    if (location.hash === '#contact') open();

    window.addEventListener('hashchange', () => {
      if (location.hash === '#contact') open();
    });
  }


  /* 2. Contact form ----------------------------------------------------- */

  const form = byId('contact-form');
  const status = byId('form-status');

  if (form && status && 'fetch' in window) {
    const sendBtn = form.querySelector('.send');
    const fieldNames = { name: 'Name', email: 'Email', message: 'Message' };

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

  const audio = byId('site-audio');
  const musicBtn = byId('music');

  if (audio && musicBtn) {
    const show = (on) => musicBtn.setAttribute('aria-pressed', String(on));

    musicBtn.addEventListener('click', () => {
      if (audio.paused) {
        const attempt = audio.play();
        if (attempt) attempt.catch(() => show(false));
      } else {
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
       middle  a laser gantry scans it and leaves an inspection colour map
       right   a robot spot-welds it, then it leaves the line
     Every P seconds the whole line moves on one station, like a transfer line.
  */

  const canvas = byId('line');

  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const freezeParam = new URLSearchParams(location.search).get('t');  // ?t=2.5 holds one moment
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const P = 4.6, T = 1.5, C = P + T;
    let GAP = 340;   // distance between stations (closer on phones)
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const lerp = (a, b, t) => a + (b - a) * t;
    const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

    // Camera: orthographic, turned so the line rises to the right, looking down 35 degrees
    const TH = -20 * Math.PI / 180, PH = 35 * Math.PI / 180;
    const cT = Math.cos(TH), sT = Math.sin(TH), cP = Math.cos(PH), sP = Math.sin(PH);
    const VIEW = [sT * cP, cT * cP, sP];
    let W = 0, H = 0, S = 1, CX = 0, CY = 0, DPR = 1;

    const pr = (p) => [CX + (p[0] * cT - p[1] * sT) * S, CY + ((p[0] * sT + p[1] * cT) * sP - p[2] * cP) * S];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const unit = (v) => { const m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; };
    const LIGHT = unit([-0.5, 0.5, 0.9]);

    const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    const lit = (c, n, amb = 0.55) => { const k = amb + (1 - amb) * Math.max(0, dot(n, LIGHT)); return [c[0] * k, c[1] * k, c[2] * k]; };

    const STEEL = [184, 190, 199], CADC = [118, 154, 196], CYAN = [125, 211, 252], EDGE = [38, 41, 47];
    const CMAP = [[59, 130, 246], [20, 184, 166], [34, 197, 94], [34, 197, 94], [163, 230, 53], [250, 204, 21], [249, 115, 22]];
    const cmap = (v) => { v = clamp(v) * (CMAP.length - 1); const i = Math.min(CMAP.length - 2, Math.floor(v)); return mix(CMAP[i], CMAP[i + 1], v - i); };
    const dev = (x, f) => 0.5 + 0.22 * Math.sin(x * 0.045 + f * 1.7) + 0.13 * Math.sin(x * 0.11 + f * 0.6 + 1);

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

    // Painter's order; faces turned away from the camera are skipped when drawn
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

    // Spot welds along the front flange, in the order the robot makes them
    const WELDS = [65, 39, 13, -13, -39, -65].map((x) => [x, 37, FZ]);
    const W0 = 0.45, WSTEP = 0.5, WDOWN = 0.1, WDWELL = 0.16;
    const weldsDone = (u) => clamp(Math.floor((u - W0 - WDOWN) / WSTEP) + 1, 0, WELDS.length);

    function drawPart(st) {
      const X = st.X, ga = st.alpha ?? 1;
      const at = (p) => pr([p[0] + X, p[1], p[2]]);

      if (st.solid > 0) {
        ctx.save();
        ctx.globalAlpha = st.solid * ga * 0.6;
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
        ctx.globalAlpha = (1 - st.solid) * ga;
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
          ctx.globalAlpha = 0.25 * (1 - st.solid) * ga;
          disc(pen, 9 * S);
          ctx.globalAlpha = (1 - st.solid) * ga;
          ctx.fillStyle = '#e0f2fe';
          disc(pen, 2.6 * S);
        }
        ctx.restore();
      }

      if (st.solid > 0) {
        ctx.save();
        ctx.globalAlpha = st.solid * ga;
        ctx.lineJoin = 'round';
        for (const f of FACES) {
          if (dot(f.n, VIEW) <= 0) continue;
          for (const s of f.slices) {
            let c;
            if (f.hollow) {
              c = [20, 21, 25];
            } else {
              c = mix(STEEL, CADC, st.cad);
              if (st.scanAmt > 0 && s.xc < st.scan) c = mix(c, cmap(dev(s.xc, f.fid)), st.scanAmt * 0.92);
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
        for (let k = 0; k < st.welds; k++) {
          const p = at(WELDS[k]);
          ctx.fillStyle = 'rgb(70,72,79)';
          ctx.beginPath(); ctx.ellipse(p[0], p[1], 3.6 * S, 2.3 * S, -0.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(176,132,84,0.9)';
          ctx.beginPath(); ctx.ellipse(p[0], p[1], 1.9 * S, 1.2 * S, -0.2, 0, Math.PI * 2); ctx.fill();
        }
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

    /* Station 2: the laser scanning gantry */
    const GCOL = [62, 65, 72];

    function rail(X, y) {
      ctx.strokeStyle = '#2d2f34';
      ctx.lineWidth = 3 * S;
      line(pr([X - 170, y, -7]), pr([X + 170, y, -7]));
    }

    function drawGantryBack(X, gx) {
      rail(X, -66);
      box(X + gx - 4, X + gx + 4, -74, -66, -10, 96, GCOL);
    }

    function drawGantryFront(X, gx, laser) {
      rail(X, 66);
      box(X + gx - 4, X + gx + 4, 66, 74, -10, 96, GCOL);

      if (laser) {
        const x = X + gx, head = pr([x, 0, 84]);
        let prof;
        if (Math.abs(gx) <= HL) prof = [[-BY, BZ], [-46, FZ], ...PROF, [BY, BZ]];
        else if (Math.abs(gx) <= BX) prof = [[-BY, BZ], [BY, BZ]];
        else prof = [[-60, 0.3], [60, 0.3]];
        const pts = prof.map(([y, z]) => pr([x, y, z]));

        ctx.save();
        ctx.fillStyle = 'rgba(34,211,238,0.07)';
        poly([head, pts[0], pts[pts.length - 1]]);
        ctx.fill();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const trace = () => {
          ctx.beginPath();
          pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.stroke();
        };
        ctx.strokeStyle = 'rgba(34,211,238,0.25)';
        ctx.lineWidth = 7 * S;
        trace();
        ctx.strokeStyle = '#a5f3fc';
        ctx.lineWidth = Math.max(1.2, 1.6 * S);
        trace();
        ctx.restore();
      }

      box(X + gx - 7, X + gx + 7, -78, 78, 96, 104, GCOL);
      box(X + gx - 6, X + gx + 6, -9, 9, 84, 96, [46, 48, 54]);

      if (laser) {
        ctx.fillStyle = 'rgba(165,243,252,0.9)';
        disc(pr([X + gx, 0, 84]), 2.2 * S);
      }
    }

    /* Station 3: the welding robot */
    // The robot stands in front of the line, to the right, so its arm reaches sideways
    const RBX = 115, RBY = 86, RB = 18, SH = 54, L1 = 128, L2 = 118, GUN = 28;
    const home = (X) => [X + 10, 60, 92];

    function robotTip(u, X) {
      const wp = WELDS.map((w) => [X + w[0], w[1], w[2]]);
      const up = (p) => [p[0], p[1], p[2] + 16];
      if (u < W0) return lerp3(home(X), up(wp[0]), ease(u / W0));
      for (let k = 0; k < wp.length; k++) {
        const s0 = W0 + k * WSTEP;
        if (u < s0 + WDOWN) return lerp3(up(wp[k]), wp[k], ease(clamp((u - s0) / WDOWN)));
        if (u < s0 + WDOWN + WDWELL) return wp[k];
        if (u < s0 + WSTEP) {
          const next = k < wp.length - 1 ? up(wp[k + 1]) : up(wp[k]);
          const q = (u - s0 - WDOWN - WDWELL) / (WSTEP - WDOWN - WDWELL);
          return q < 0.3 ? lerp3(wp[k], up(wp[k]), ease(q / 0.3)) : lerp3(up(wp[k]), next, ease((q - 0.3) / 0.7));
        }
      }
      const end = W0 + wp.length * WSTEP;
      return lerp3(up(wp[wp.length - 1]), home(X), ease(clamp((u - end) / 0.6)));
    }

    function drawRobotBase(X) {
      const bx = X + RBX;
      box(bx - RB, bx + RB, RBY - RB, RBY + RB, -100, 8, [42, 44, 49]);
      cylinder(bx, RBY, 8, 30, 20, [234, 88, 12]);
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

    function drawArm(X, tip) {
      const bx = X + RBX;
      const J = [bx, RBY, SH], wr = [tip[0], tip[1], tip[2] + GUN];
      const dx = wr[0] - J[0], dy = wr[1] - J[1], dz = wr[2] - J[2];
      const r = Math.hypot(dx, dy) || 0.001, ux = dx / r, uy = dy / r;
      const d = Math.min(Math.hypot(r, dz), L1 + L2 - 0.5);
      const a = Math.atan2(dz, r) + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const E = [J[0] + ux * L1 * Math.cos(a), J[1] + uy * L1 * Math.cos(a), J[2] + L1 * Math.sin(a)];
      const [j, e, w, t] = [J, E, wr, tip].map(pr);

      limb(pr([bx, RBY, 30]), j, 18, '#9a3412', '#ea580c');
      limb(j, e, 16, '#9a3412', '#f97316');
      limb(e, w, 13, '#9a3412', '#fb923c');
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 6 * S;
      line(w, t);
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 2.5 * S;
      line(lerp3([t[0], t[1], 0], [w[0], w[1], 0], 0.15), t);
      joint(j, 8);
      joint(e, 6.5);
      joint(w, 5);
    }

    function drawWeldFx(u, X) {
      WELDS.forEach((wp, k) => {
        const ts = u - (W0 + k * WSTEP + WDOWN);
        if (ts < 0 || ts > 0.45) return;
        const p = pr([X + wp[0], wp[1], wp[2]]);
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
          const life = 0.25 + 0.2 * rnd(k * 31 + j);
          if (ts > life) continue;
          const ang = -Math.PI * (0.08 + 0.84 * rnd(k * 17 + j * 3));
          const v = (90 + 170 * rnd(k * 7 + j * 11)) * S;
          const vx = Math.cos(ang) * v, vy = Math.sin(ang) * v, gy = 900 * S;
          const x = p[0] + vx * ts, y = p[1] + vy * ts + 0.5 * gy * ts * ts;
          ctx.strokeStyle = `rgba(253,224,71,${1 - ts / life})`;
          line([x, y], [x - vx * 0.03, y - (vy + gy * ts) * 0.03]);
        }
        ctx.restore();
      });
    }

    /* One frame of the line at time t (seconds) */
    function draw(t) {
      const n = Math.floor(t / C), tc = t - n * C;
      const proc = tc < P;
      const p = proc ? tc / P : 1;
      const q = proc ? 0 : ease((tc - P) / T);
      const u = p * P;
      const X1 = -GAP, X2 = 0, X3 = GAP;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const gx = proc ? lerp(-100, 100, ease(seg(p, 0.1, 0.85))) : lerp(100, -100, q);
      drawGantryBack(X2, gx);
      drawConveyor((n + q) * GAP);

      const grid = proc ? Math.min(seg(p, 0, 0.08), 1 - seg(p, 0.86, 1)) : 0;
      if (grid > 0) drawGrid(X1, grid);

      const designing = proc
        ? { X: X1, wire: seg(p, 0.04, 0.5), solid: seg(p, 0.46, 0.7), cad: 1, edgeDark: seg(p, 0.55, 0.78), scanAmt: 0, scan: -1e9, welds: 0 }
        : { X: lerp(X1, X2, q), wire: 1, solid: 1, cad: 1 - q, edgeDark: 1, scanAmt: 0, scan: -1e9, welds: 0 };
      const checking = proc
        ? { X: X2, wire: 1, solid: 1, cad: 0, edgeDark: 1, scanAmt: 1, scan: p < 0.1 ? -1e9 : gx, welds: 0 }
        : { X: lerp(X2, X3, q), wire: 1, solid: 1, cad: 0, edgeDark: 1, scanAmt: 1 - q, scan: 1e9, welds: 0 };
      const making = proc
        ? { X: X3, wire: 1, solid: 1, cad: 0, edgeDark: 1, scanAmt: 0, scan: -1e9, welds: weldsDone(u) }
        : { X: lerp(X3, X3 + GAP, q), wire: 1, solid: 1, cad: 0, edgeDark: 1, scanAmt: 0, scan: -1e9, welds: WELDS.length, alpha: 1 - seg(q, 0.55, 1) };

      drawPart(designing);
      drawPart(checking);
      drawPart(making);
      if (proc) drawTriad(X1, Math.min(seg(p, 0.05, 0.15), 1 - seg(p, 0.82, 0.95)));

      drawGantryFront(X2, gx, proc && p > 0.1 && p < 0.85);
      drawRobotBase(X3);
      drawArm(X3, proc ? robotTip(u, X3) : home(X3));
      if (proc) drawWeldFx(u, X3);
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      GAP = W < 700 ? 250 : 340;

      // Fit the stations and the robot to the screen width
      const xs = [];
      [-GAP, GAP].forEach((X) => [-1, 1].forEach((a) => [-1, 1].forEach((b) => xs.push([X + a * BX, b * BY]))));
      [-1, 1].forEach((a) => [-1, 1].forEach((b) => xs.push([GAP + RBX + a * RB, RBY + b * RB])));
      const sx = xs.map(([x, y]) => x * cT - y * sT);
      const lo = Math.min(...sx), hi = Math.max(...sx);
      S = Math.min(1.4, (W - 32) / (hi - lo));
      CX = W / 2 - ((lo + hi) / 2) * S;
      CY = H * (W < 700 ? 0.55 : 0.56);
    }

    resize();

    if (freezeParam !== null || still) {
      const t = freezeParam !== null ? parseFloat(freezeParam) || 0 : 0.62 * P;
      draw(t);
      window.addEventListener('resize', () => { resize(); draw(t); });
    } else {
      let start = null;
      const frame = (now) => {
        if (start === null) start = now;
        draw((now - start) / 1000);
        requestAnimationFrame(frame);
      };
      window.addEventListener('resize', resize);
      requestAnimationFrame(frame);
    }
  }
})();
