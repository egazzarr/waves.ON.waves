/* RADIO LINES - generative drawing that follows your mouse (p5.js 1.x and 2.x)
   Move the mouse over the picture: marks grow where you move, in the direction you move,
   and new strokes appear around the cursor by themselves. Growing thorns bend towards the mouse.
   Black / grey lines on a TRANSPARENT background, with shapes filled white or black,
   and big text on top.

   Brushes   1 spikes   2 maps   3 lines   4 small text (click)   5 big text (click)   6 draw line (drag)   7 square (drag)
   Keys      L live (draw by moving / only while pressed)   A auto (strokes appear by themselves)
             B background (transparent / white / black)   C color (black / electric blue / pink / orange / gold)   Z undo   X clear   G more strokes
             S save PNG   [ ] brush size
   Click on the picture once so the keys work, or use the buttons. */

const SIZE_MM = [160, 290];          // width, height in mm of the printed page
const DPI = 400;                    // PNG resolution: 300, 450, 600 ...
const WHITE = 0.3, BLACK = 0.2;      // chance that a map shape is filled white / black (the rest stays transparent)

const TEXT = ['We hold these black rectangles in our hands all day long.'];
const BIG_TEXT = ['RADIO', 'CHANNEL 16', 'OVER', 'MAYDAY'];     // used when the big text box is empty
const LABELS = ['A0', 'A1', 'A2', 'A12', 'D0', 'D7', 'IRQ', 'NMI', 'RDY', 'CLK', 'GND', '+5V', 'R/W', 'PHI2', 'TX', 'RX', 'PTT', 'ANT', 'SQL', 'DSC'];

const EDGE = 16;                      // nothing is drawn closer than this to the border (design units, of 1000 across)
const W0 = 1000, H0 = Math.round(1000 * SIZE_MM[1] / SIZE_MM[0]);
const INK = 'rgba(8,8,8,.97)', WHITEF = 'rgba(255,255,255,.93)', LINE = 'rgba(15,15,15,.88)', GREYL = 'rgba(60,60,60,.8)', PALE = 'rgba(235,235,235,.85)';
const TXT = 'rgba(30,30,30,.88)', BIGINK = 'rgba(0,0,0,.95)';
const COLORS = {                     // ink colour of the whole drawing (key C cycles). null = the original black / grey
  black: null,
  'electric blue': [14, 34, 210],
  pink: [255, 20, 150],
  orange: [255, 100, 0],
  gold: [140, 106, 40],
};
const hasGridMask = () => items.some(o => o.square && o.grid && !o.dead);

let hollowNow = false, items = [], growers = [], strokes = [], strokeLayers = {}, SID = 0, count = 0, cur = null, down = false;
let brush = 'spikes', size = 40, textSize = 8, bigSize = 120, growth = 1, pointy = 0.3, pull = 0.5, live = true, auto = false, bg = 0;
let mp = null, mouseHd = 0, lastMove = 0, ctx = null, layer = null, lctx = null, ui = {};
let colorName = 'black', PAL = {};

/* ---- helpers (const arrows, and no for/while loops: the p5 editor stops loops longer than 100 ms) ---- */
const R = (a, b) => a + Math.random() * (b - a);
const choice = a => a[Math.floor(Math.random() * a.length)];
const each = (n, fn) => { Array.from({ length: n }, (_, i) => fn(i)); };
const grow = (g, its) => { g.sid = SID; g.done = false; g.items = its || []; growers.push(g); return g; };
const snap = p => [Math.round(p[0] / 6) * 6, Math.round(p[1] / 6) * 6];
const lerpA = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
const blobPts = (x, y, r, n = 7) => Array.from({ length: n }, (_, k) => [x + Math.cos(k / n * 6.283) * r * R(.6, 1.2), y + Math.sin(k / n * 6.283) * r * R(.6, 1.2)]);

// items: growing ones stay "live" and are redrawn every frame; finished ones are baked into one picture
const add = (o, fixed) => {
  o.sid = SID;
  if (strokeLayers[o.sid]) { o.aboveGrid = strokeLayers[o.sid]; }
  if (o.lw && o.lineAlpha === undefined) { o.lineAlpha = randomAlpha(); }
  o.live = !fixed && !o.big;
  items.push(o);
  if (fixed) { bake(o); }
  return o;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inside = (x, y) => x >= EDGE && x <= W0 - EDGE && y >= EDGE && y <= H0 - EDGE;
const fits = o => {                                               // false when any point of the mark would touch or cross the border
  if (o.square) { return inside(o.x, o.y) && inside(o.x + o.side[0], o.y + o.side[1]); }
  if (o.rows) { return true; }
  if (o.lines) { const w = Math.max(...o.lines.map(l => l.length)) * o.size * .62, h = o.lines.length * (o.lh || o.size * 1.4); return inside(o.x, o.y - h) && inside(o.x + w, o.y + h); }
  const ps = o.multi ? o.pts.flat() : o.pts; return !ps || ps.every(q => inside(q[0], q[1]));
};
const margin = () => EDGE + ((brush === 'text' || brush === 'big' || brush === 'square') ? 0 : size * 1.6);
const keep = p => { const m = margin(); return [clamp(p[0], m, W0 - m), clamp(p[1], m, H0 - m)]; };
const bake = o => {
  if (!fits(o)) { o.dead = true; return; }
  if (o.aboveGrid) { o.live = true; return; }
  if (o.foreground) { o.live = true; return; }
  o.live = false;
  if (!o.foreground && !o.big && lctx) { renderItem(lctx, o); }
};
const rebuild = () => { lctx.clearRect(0, 0, W0, H0); items.forEach(o => { if (!o.live && !o.foreground && !o.big && !o.dead) { renderItem(lctx, o); } }); };

/* ---------------------------------------------------------------- p5 */

function setup() {
  pixelDensity(1); frameRate(30);
  createCanvas(W0, H0);
  ctx = drawingContext;
  const cv = ctx.canvas;
  cv.style.width = 'min(94vw, 560px)'; cv.style.height = 'auto'; cv.style.cursor = 'crosshair'; cv.style.touchAction = 'none';
  cv.style.background = 'repeating-conic-gradient(#d8d8d8 0% 25%, #f2f2f2 0% 50%) 0 0 / 24px 24px';
  layer = document.createElement('canvas'); layer.width = W0; layer.height = H0; lctx = layer.getContext('2d');
  buildUI(cv); attach(cv);
}

function draw() {
  advance();
  if (auto && frameCount % 24 === 0 && items.length < 5000 && !down) { autoStroke(); }
  if (cur && performance.now() - lastMove > 300) { endStroke(cur); cur = null; }
  ctx.clearRect(0, 0, W0, H0);
  if (bg) { ctx.fillStyle = bg === 1 ? '#fff' : '#000'; ctx.fillRect(0, 0, W0, H0); }
  ctx.drawImage(layer, 0, 0);
  items.forEach(o => { if (o.live && !o.foreground && !o.aboveGrid && !o.dead) { renderItem(ctx, o); } });
  items.forEach(o => { if (o.live && o.foreground && !o.aboveGrid && !o.dead) { renderItem(ctx, o); } });
  items.forEach(o => { if (o.live && o.aboveGrid && !o.dead) { renderItem(ctx, o); } });
  items.forEach(o => { if (o.big) { renderItem(ctx, o); } });
  if (!auto && growers.length === 0 && !cur && !down) { noLoop(); }
}

/* ---------------------------------------------------------------- mouse, keys, interface */

const attach = cv => {
  const pos = e => { const r = cv.getBoundingClientRect(); return keep([(e.clientX - r.left) / r.width * W0, (e.clientY - r.top) / r.height * H0]); };
  cv.addEventListener('pointerdown', e => {
    down = true; const p = pos(e); mp = p; lastMove = performance.now();
    if (cur) { endStroke(cur); cur = null; }
    if (brush === 'text' || brush === 'big') { startStroke(p); endStroke(cur); cur = null; } else { startStroke(p); }
    loop(); e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    const p = pos(e);
    if (mp) { const d = Math.hypot(p[0] - mp[0], p[1] - mp[1]); if (d > 2) { mouseHd = lerpA(mouseHd, Math.atan2(p[1] - mp[1], p[0] - mp[0]), .3); } }
    mp = p; lastMove = performance.now();
    if (!(live || down) || brush === 'text' || brush === 'big') { return; }
    if (!cur) { startStroke(p); loop(); return; }
    const l = cur.last, d = Math.hypot(p[0] - l[0], p[1] - l[1]);
    if (d < BR[brush].step) { return; }
    SID = cur.id; BR[brush].move(cur, p, Math.atan2(p[1] - l[1], p[0] - l[0]), d); cur.last = p;
  });
  window.addEventListener('pointerup', () => {
    down = false;
    if (cur && (brush === 'drawline' || brush === 'square' || !live)) { endStroke(cur); cur = null; }
  });
  cv.addEventListener('pointerleave', () => { mp = null; if (cur) { endStroke(cur); cur = null; } });
  window.addEventListener('keydown', e => {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) { return; }
    const k = e.key.toLowerCase(), b = { 1: 'spikes', 2: 'maps', 3: 'circuits', 4: 'text', 5: 'big', 6: 'drawline', 7: 'square' }[k];
    if (b) { pick(b === 'circuits' ? 'lines' : b); }
    if (k === 'z') { undo(); } if (k === 'x') { clearAll(); } if (k === 'g') { each(6, autoStroke); settle(); loop(); } if (k === 's') { savePNG(); }
    if (k === 'a') { toggle('auto'); } if (k === 'l') { toggle('live'); } if (k === 'b') { cycleBg(); } if (k === 'c') { cycleColor(); }
    if (k === '[') { size = Math.max(10, size - 5); ui.size.value = size; } if (k === ']') { size = Math.min(100, size + 5); ui.size.value = size; }
  });
};

const startStroke = p => {
  SID = ++count; strokes.push(SID); cur = { id: SID, last: p, hold: [] };
  cur.aboveGrid = (brush === 'spikes' || brush === 'maps') && (!hasGridMask() || Math.random() < .5);
  strokeLayers[SID] = cur.aboveGrid;
  BR[brush].begin(cur, p); BR[brush].move(cur, p, 0, 1e9);
};
const endStroke = c => {
  (c.hold || []).forEach(bake); c.hold = [];
};

const pick = b => { brush = b; ['drawline', 'spikes', 'maps', 'lines', 'text', 'big', 'square'].forEach(k => { if (ui[k]) ui[k].style.fontWeight = k === b ? 'bold' : 'normal'; }); };
const toggle = k => { if (k === 'auto') { auto = !auto; ui.auto.textContent = 'auto (A): ' + (auto ? 'on' : 'off'); } else { live = !live; ui.live.textContent = 'live (L): ' + (live ? 'on' : 'off'); } loop(); };
const setColor = n => {                                           // every dark tone becomes the chosen colour; white and pale stay as they are
  colorName = n; const c = COLORS[n], rgba = (a, w = 0) => `rgba(${c.map(v => Math.round(v + (255 - v) * w)).join(',')},${a})`;
  PAL = c ? { [INK]: rgba(.97), [LINE]: rgba(.88), [GREYL]: rgba(.8, .35), [TXT]: rgba(.88), [BIGINK]: rgba(.95) } : {};
  if (ui.color) { ui.color.textContent = 'color (C): ' + n; }
  if (lctx) { rebuild(); } loop();
};
const cycleColor = () => { const ks = Object.keys(COLORS); setColor(ks[(ks.indexOf(colorName) + 1) % ks.length]); };
const cycleBg = () => { bg = (bg + 1) % 3; ui.bg.textContent = 'background (B): ' + ['transparent', 'white', 'black'][bg]; loop(); };

const buildUI = cv => {
  const bar = document.createElement('div'); bar.style.cssText = 'font:300 12px "Merriweather", Georgia, serif;max-width:560px;margin:6px 0';
  cv.parentNode.insertBefore(bar, cv.nextSibling);
  const btn = (txt, fn) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = fn; bar.appendChild(b); return b; };
  const row = () => bar.appendChild(document.createElement('div'));
  ui.drawline = btn('draw line (6)', () => pick('drawline'));
  ui.square = btn('square (7)', () => pick('square'));
  ['spikes (1)', 'maps (2)', 'circuits (3)', 'text (4)', 'big text (5)'].forEach((t, i) => { ui[['spikes', 'maps', 'lines', 'text', 'big'][i]] = btn(t, () => pick(['spikes', 'maps', 'lines', 'text', 'big'][i])); });
  row();
  const textControl = (label, control) => {
    const d = document.createElement('div'), l = document.createElement('label');
    l.textContent = label + ' '; l.appendChild(control); d.appendChild(l); bar.appendChild(d); return control;
  };
  const smallText = Object.assign(document.createElement('textarea'), { value: TEXT[0], rows: 3, cols: 30, id: 'smalltext' });
  smallText.style.verticalAlign = 'top';
  textControl('small text (4)', smallText);
  textControl('big text (5)', Object.assign(document.createElement('input'), { value: 'RADIO', size: 10, id: 'bigtext' }));
  row(); ui.live = btn('live (L): on', () => toggle('live')); ui.auto = btn('auto (A): off', () => toggle('auto')); ui.bg = btn('background (B): transparent', cycleBg);
  ui.color = btn('color (C): black', cycleColor);
  row(); btn('undo (Z)', undo); btn('clear (X)', clearAll); btn('more (G)', () => { each(6, autoStroke); settle(); loop(); }); btn('save PNG (S)', savePNG);
  const slider = (label, mn, mx, st, v, fn) => {
    const d = row(), s = document.createElement('input'); d.append(label + ' '); s.type = 'range'; s.min = mn; s.max = mx; s.step = st; s.value = v;
    s.oninput = () => fn(+s.value); d.appendChild(s); return s;
  };
  ui.size = slider('brush size / line thickness', 10, 100, 1, size, v => { size = v; });
  ui.textsize = slider('small text size', 4, 20, 1, textSize, v => { textSize = v; });
  ui.bigsize = slider('BIG text size', 20, 250, 1, bigSize, v => { bigSize = v; });
  slider('growth      ', .2, 2, .05, growth, v => { growth = v; });
  slider('pointy      ', 0, 1, .05, pointy, v => { pointy = v; });
  slider('mouse pull  ', 0, 1, .05, pull, v => { pull = v; });
  pick('spikes');
};

const advance = () => {                                           // every grower advances one frame
  growers.forEach(g => { SID = g.sid; if (!g.done) { g.update(); } });
  growers.forEach(g => { if (g.done) { g.items.forEach(bake); } });
  growers = growers.filter(g => !g.done);
};
const settle = () => { each(150, () => { if (growers.length) { advance(); } }); };
const undo = () => { const id = strokes.pop(); delete strokeLayers[id]; items = items.filter(i => i.sid !== id); growers = growers.filter(g => g.sid !== id); rebuild(); loop(); };
const clearAll = () => { items = []; growers = []; strokes = []; strokeLayers = {}; cur = null; rebuild(); loop(); };

const autoStroke = () => {                                        // a stroke that starts near the mouse and heads the way it moves
  const b = choice(['spikes', 'spikes', 'maps', 'lines']), br = BR[b], s0 = size, near = mp && performance.now() - lastMove < 2500;
  size = s0 * R(.6, 1.3);
  const p = keep(near ? [mp[0] + R(-60, 60), mp[1] + R(-60, 60)] : [R(.1, .9) * W0, R(.1, .9) * H0]);
  let a = near ? mouseHd + R(-1.1, 1.1) : R(0, 6.28);
  SID = ++count; strokes.push(SID);
  const c = { id: SID, hold: [], aboveGrid: (b === 'spikes' || b === 'maps') && (!hasGridMask() || Math.random() < .5) }, turn = R(-.08, .08), d = b === 'maps' ? size * .5 : 8;
  strokeLayers[SID] = c.aboveGrid;
  br.begin(c, p); br.move(c, p, a, 1e9);
  each(Math.floor(R(14, 40)), () => {
    a += turn + R(-.12, .12);
    if (near) { a = lerpA(a, Math.atan2(mp[1] - p[1], mp[0] - p[0]), .04 * pull); }
    if (p[0] < 0 || p[0] > W0 || p[1] < 0 || p[1] > H0) { a = lerpA(a, Math.atan2(H0 / 2 - p[1], W0 / 2 - p[0]), .4); }
    p[0] += Math.cos(a) * d; p[1] += Math.sin(a) * d; const q = keep(p); p[0] = q[0]; p[1] = q[1]; br.move(c, p.slice(), a, d);
  });
  endStroke(c); size = s0;
};

/* ---------------------------------------------------------------- spikes */

const randomAlpha = () => Math.random() < .14 ? 0 : (Math.random() < .28 ? R(.3, .72) : R(.84, 1));
const pt = (x, y, w, tp) => ({
  x, y, w, j: [R(-.3, .5), R(-.3, .5)],
  t: [Math.random() < tp * pointy ? R(.3, 1.1) * (.4 + .6 * pointy) : 0, Math.random() < tp * pointy ? R(.3, 1.1) * (.4 + .6 * pointy) : 0],
});
const ink = (o, hol) => Object.assign(o, { closed: true, fill: hol ? null : INK, fillAlpha: hol ? 1 : randomAlpha(), lw: hol ? 1.6 : 1 + (1 - pointy) * 4, col: INK, smooth: pointy < .75 });

const ribbon = (sp, tooth) => {                                   // outline of a spine, with a few teeth leaning forward
  const L = [], Rr = [];
  sp.forEach((p, i) => {
    const q = sp[Math.min(i + 1, sp.length - 1)], o = sp[Math.max(i - 1, 0)], a = Math.atan2(q.y - o.y, q.x - o.x);
    const nx = -Math.sin(a), ny = Math.cos(a), tx = Math.cos(a), ty = Math.sin(a);
    [[1, L], [-1, Rr]].forEach(([sd, arr], k) => {
      const off = p.w * (1 + p.j[k]);
      arr.push([p.x + nx * sd * off, p.y + ny * sd * off]);
      if (p.t[k]) { const l = p.t[k] * tooth; arr.push([p.x + nx * sd * (off + l) + tx * l * 1.2, p.y + ny * sd * (off + l) + ty * l * 1.2]); }
    });
  });
  return L.concat(Rr.reverse());
};

const thorn = (x, y, ang, len, w0, depth, hol) => {
  const sp = [pt(x, y, w0, 0)], it = add(ink({ pts: [] }, hol));
  len *= .75 + .25 * pointy;
  grow({
    update() {
      each(2, () => {
        if (this.done) { return; }
        const l = sp[sp.length - 1]; ang += R(-.3, .3);
        if (mp && pull > 0) { ang = lerpA(ang, Math.atan2(mp[1] - l.y, mp[0] - l.x), .03 * pull); }          // thorns lean towards the mouse
        const nx = l.x + Math.cos(ang) * 5, ny = l.y + Math.sin(ang) * 5, fr = sp.length * 5 / len;
        sp.push(pt(nx, ny, w0 * Math.pow(Math.max(0, 1 - fr), .7) + .6 + (1 - pointy) * w0 * .5, .3));
        if (fr > .3 && fr < .75 && depth < 2 && Math.random() < .07 * growth) { thorn(nx, ny, ang + (Math.random() < .5 ? 1 : -1) * R(.5, 1.2), len * .55, w0 * .6, depth + 1, hol); }
        if (fr >= 1) { this.done = true; }
      });
      it.pts = ribbon(sp, w0 * 3);
    },
  }, [it]);
};

const spikeMove = (c, p, ang) => {
  const n = c.sp.length;
  c.hd = lerpA(c.hd, ang, .4);
  const w = size * .5 * (.45 + .9 * noise(n * .13, c.id)) * Math.min(1, (n + 1) / 5);
  c.sp.push(pt(p[0] + R(-1.5, 1.5), p[1] + R(-1.5, 1.5), w, .5));
  if (n > 1) {
    [1, -1].forEach(sd => {
      if (Math.random() < .5 * growth) { thorn(p[0] + Math.cos(c.hd + sd * 1.57) * w * .8, p[1] + Math.sin(c.hd + sd * 1.57) * w * .8, c.hd + sd * R(.25, 1.3), size * (.6 + 3 * Math.pow(Math.random(), 2)), size * R(.12, .28), 0, c.hol); }
    });
  }
  if (Math.random() < .3 * growth) { add(ink({ pts: blobPts(p[0] + R(-1, 1) * size * 1.6, p[1] + R(-1, 1) * size * 1.6, R(1.5, 4.5)) }, c.hol), true); }
  c.body.pts = ribbon(c.sp, size * .7);
};

/* ---------------------------------------------------------------- maps */

const mapMove = (c, p, ang, d) => {
  c.hd = lerpA(c.hd, ang, .35); c.acc += d;
  if (c.acc > size * .5) { c.acc = 0; blob(p[0], p[1], c.hd, size * R(.5, 1.1), false); }
};

const blob = (x, y, hd, R0, small) => {                          // uneven messy splash: lobes + jitter, a few islands and short hatching inside
  const M = small ? 16 : 56, r0 = Math.random(), el = R(1.05 + pointy * .05, 1.5 + pointy * .9), ch = Math.cos(hd), sh = Math.sin(hd);
  const fill = r0 < WHITE ? WHITEF : (r0 < WHITE + BLACK ? INK : null);
  const fillAlpha = fill ? randomAlpha() : 1;
  const lobes = Array.from({ length: 4 }, (_, k) => [k + 2, R(0, 6.28), R(.04 + pointy * .1, .12 + pointy * .3) / (k * .6 + 1)]);
  const prof = Array.from({ length: M }, (_, k) => {
    const a = k / M * 6.283, jitter = R(-.025 - pointy * .12, .025 + pointy * .12);
    return Math.max(.25, 1 + lobes.reduce((u, l) => u + Math.cos(l[0] * a + l[1]) * l[2], 0) + jitter + (pointy > .35 && Math.random() < .08 ? R(.2, .6) * pointy : 0));
  });
  const warp = (a, v, e) => { const lx = Math.cos(a) * v * el * e, ly = Math.sin(a) * v * e; return [x + lx * ch - ly * sh, y + lx * sh + ly * ch]; };
  const edge = add({ pts: [], closed: true, fill, fillAlpha, lw: fill === INK ? 1 : 1.1, col: LINE, smooth: pointy < .55 });
  const inner = small ? [] : Array.from({ length: Math.floor(R(1, 4)) }, () => {   // islands and holes inside the splash
    const a0 = R(0, 6.28), d = R(.15, .85), n = pointy < .55 ? 16 : 9, rr = R(.1, .28), ph = R(0, 6.28);
    return { a0, d, rr, it: add({ pts: [], closed: true, fill: Math.random() < .35 ? (fill === INK ? WHITEF : INK) : null, fillAlpha: randomAlpha(), lw: .6, col: fill === INK ? PALE : GREYL, smooth: pointy < .55 }), sh: Array.from({ length: n }, () => R(.5, 1.3)) };
  });
  const hatch = small ? [] : Array.from({ length: Math.floor(R(0, 9) * growth) }, () => ({ a0: R(0, 6.28), d: R(0, .6), len: R(.15, .5), jg: R(-.12, .12), it: add({ pts: [], lw: .55, col: fill === INK ? PALE : LINE }) }));
  let t = 0;
  grow({
    update() {
      t++;
      const e = Math.min(1, t / 10), ee = e * (2 - e);
      edge.pts = prof.map((pr, k) => warp(k / M * 6.283, pr * R0, ee));
      inner.forEach(o => {
        const c0 = warp(o.a0, o.d * R0, ee);
        const drift = pointy * o.d * R0 * .8 * ee;
        o.it.pts = o.sh.map((v, k) => { const a = k / o.sh.length * 6.283; return [c0[0] + Math.cos(a) * v * o.rr * R0 * ee * 1.4, c0[1] + Math.sin(a) * v * o.rr * R0 * ee]; });
        if (drift) { o.it.pts = o.it.pts.map((q, k) => [q[0] + Math.cos(o.a0 + k * .7) * drift, q[1] + Math.sin(o.a0 + k * .7) * drift]); }
      });
      hatch.forEach(o => {
        const c0 = warp(o.a0, o.d * R0, ee), l = o.len * R0 * ee;
        o.it.pts = [c0, [c0[0] + (ch - o.jg * sh) * l * 1.4, c0[1] + (sh + o.jg * ch) * l * 1.4]];
      });
      if (t >= 12) { this.done = true; }
    },
  }, [edge].concat(inner.map(o => o.it), hatch.map(o => o.it)));
  if (!small) {                                                   // loose spatter: small ragged bits and specks around
    each(Math.floor(R(3, 9) * growth), () => { const a = R(0, 6.28), d = R0 * el * R(1.1, 2.4); blob(x + Math.cos(a) * d, y + Math.sin(a) * d, R(0, 6.28), R0 * R(.06, .2), true); });
    each(Math.floor(R(2, 8) * growth), () => { const a = R(0, 6.28), d = R0 * el * R(1, 2.8); add({ pts: blobPts(x + Math.cos(a) * d, y + Math.sin(a) * d, R(.8, 2.2), 6), closed: true, fill: INK, fillAlpha: randomAlpha() }, true); });
  }
};

/* ---------------------------------------------------------------- electric lines */

const lineMove = (c, p) => {
  const l = c.g[c.g.length - 1], t = snap(p), dx = t[0] - l[0], dy = t[1] - l[1];
  if (!dx && !dy) { return; }
  if (dx && dy) { c.g.push(Math.abs(dx) >= Math.abs(dy) ? [t[0], l[1]] : [l[0], t[1]]); }
  const a = c.g[c.g.length - 1], pdx = t[0] - a[0], pdy = t[1] - a[1];
  c.g.push(t);
  if (pdx || pdy) { c.d = Math.abs(pdx) >= Math.abs(pdy) ? [Math.sign(pdx), 0] : [0, Math.sign(pdy)]; }
  c.wire.pts = c.g.map(q => q.slice());
  c.dist += Math.abs(dx) + Math.abs(dy);
  if (c.dist > 34 / growth) { c.dist = 0; spawnLine(t, c.d); }
};

const spawnLine = (t, d) => {
  const r = Math.random(), perp = [-d[1], d[0]], side = Math.random() < .5 ? 1 : -1;
  if (r < .3) {                                                   // bus: parallel lines growing forward
    const n = Math.floor(R(4, 9)), L = R(60, 200), pre = choice(['A', 'D']);
    const starts = Array.from({ length: n }, (_, k) => [t[0] + perp[0] * side * 6 * (k + 1), t[1] + perp[1] * side * 6 * (k + 1)]);
    if (perp[1] !== 0) { add({ lines: starts.map((s, k) => pre + k), x: t[0] + perp[0] * side * 6 - 20, y: t[1] + perp[1] * side * 6, size: 4.4, lh: 6 }, true); }
    const it = add({ multi: true, pts: [], lw: .6, col: LINE }); let len = 0;
    grow({ update() { len += 4; it.pts = starts.map(s => [s, [s[0] + d[0] * len, s[1] + d[1] * len]]); if (len >= L) { this.done = true; } } }, [it]);
  } else if (r < .85) {                                           // branch: walks, turns at right angles, ends in a dot, chip or label
    let h = Math.random() < .6 ? [perp[0] * side, perp[1] * side] : d.slice(); const N = Math.floor(R(8, 30)), pts = [t.slice()];
    const it = add({ pts, lw: .7, col: LINE }); let k = 0;
    grow({
      update() {
        const l = pts[pts.length - 1], tl = [-h[1], h[0]], tr = [h[1], -h[0]];
        if (Math.random() < .18) {
          const closer = mp && Math.random() < pull ? (Math.hypot(mp[0] - (l[0] + tl[0]), mp[1] - (l[1] + tl[1])) < Math.hypot(mp[0] - (l[0] + tr[0]), mp[1] - (l[1] + tr[1]))) : Math.random() < .5;
          h = closer ? tl : tr;
        }
        it.pts = pts.concat([[l[0] + h[0] * 6, l[1] + h[1] * 6]]); pts.push(it.pts[it.pts.length - 1]);
        if (++k >= N) { this.done = true; finishBranch(pts[pts.length - 1]); }
      },
    }, [it]);
  } else { chip(t[0], t[1]); }
};

const finishBranch = e => {
  const u = Math.random();
  if (u < .4) { add({ pts: blobPts(e[0], e[1], 1.8, 8), closed: true, fill: INK }, true); }
  else if (u < .7) { chip(e[0], e[1]); }
  else { add({ lines: [choice(LABELS)], x: e[0] + 3, y: e[1] - 4, size: 4.4 }, true); }
};

const chip = (x, y) => {
  const pins = Math.floor(R(4, 10)), w = Math.round(R(36, 70) / 6) * 6, h = (pins + 1) * 6, ys = Array.from({ length: pins }, (_, i) => y + (i + 1) * 6);
  add({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true, fill: Math.random() < .12 ? WHITEF : null, lw: .7, col: LINE }, true);
  add({ multi: true, lw: .6, col: LINE, pts: ys.map(v => [[x - 6, v], [x, v]]).concat(ys.map(v => [[x + w, v], [x + w + 6, v]])) }, true);
  add({ lines: ys.map(() => choice(LABELS)), x: x + 2, y: y + 6, size: 3.6, lh: 6 }, true);
  add({ lines: [choice(['R', 'C', 'U', 'Q', 'FB', 'J']) + Math.floor(R(1, 60))], x: x + 2, y: y - 6, size: 4.6 }, true);
};

/* ---------------------------------------------------------------- text */

const textBlock = (c, p) => {                                     // small typewriter block: normal, upside down or mirrored
  const per = Math.floor(R(26, 40)), input = document.getElementById('smalltext'), source = input && input.value ? input.value : TEXT[0];
  const lines = source.split(/\r?\n/).flatMap(line => line.split(' ').reduce((acc, w) => {
    if ((acc[acc.length - 1] + w).length > per) { acc.push(w + ' '); } else { acc[acc.length - 1] += w + ' '; }
    return acc;
  }, ['']));
  const sz = textSize, w = Math.max(...lines.map(l => l.length)) * sz * .62, h = lines.length * sz * 1.4;
  add({ lines, x: clamp(p[0], EDGE, W0 - EDGE - w), y: clamp(p[1], EDGE + sz, H0 - EDGE - h), size: sz, mode: 0, halo: Math.random() < .6 }, true);
};

const drawLineBegin = (c, p) => {
  c.line = add({ pts: [p.slice()], lw: drawLineWidth(), col: LINE });
  c.hold.push(c.line);
};

const drawLineMove = (c, p) => {
  c.line.pts.push(p.slice());
};

const squareGrid = (x, y, side, stepX, stepY) => {
  const vertical = Array.from({ length: Math.max(0, Math.ceil(side[0] / stepX) - 1) }, (_, i) => {
    const v = (i + 1) * stepX;
    return [[x + v, y], [x + v, y + side[1]]];
  });
  const horizontal = Array.from({ length: Math.max(0, Math.ceil(side[1] / stepY) - 1) }, (_, i) => {
    const v = (i + 1) * stepY;
    return [[x, y + v], [x + side[0], y + v]];
  });
  return vertical.concat(horizontal);
};

const squareBegin = (c, p) => {
  c.start = p.slice();
  const stepX = Math.max(12, Math.round(size * R(.35, 1.15) / 6) * 6);
  const stepY = Math.max(12, Math.round(size * R(.35, 1.15) / 6) * 6);
  const grid = Math.random() >= .28;
  c.square = add({
    square: true, grid, x: p[0], y: p[1], side: [0, 0], stepX, stepY,
    lw: R(.45, 1), col: LINE, pts: [], marks: [], foreground: grid,
  });
  c.hold.push(c.square);
};

const squareMove = (c, p) => {
  const x = Math.min(c.start[0], p[0]), y = Math.min(c.start[1], p[1]);
  const side = [Math.max(12, Math.abs(p[0] - c.start[0])), Math.max(12, Math.abs(p[1] - c.start[1]))];
  c.square.x = clamp(x, EDGE, W0 - EDGE - side[0]);
  c.square.y = clamp(y, EDGE, H0 - EDGE - side[1]);
  c.square.side = [Math.min(side[0], W0 - EDGE - c.square.x), Math.min(side[1], H0 - EDGE - c.square.y)];
  c.square.pts = squareGrid(c.square.x, c.square.y, c.square.side, c.square.stepX, c.square.stepY);
  const xs = Array.from({ length: Math.max(0, Math.ceil(c.square.side[0] / c.square.stepX) - 1) }, (_, i) => (i + 1) * c.square.stepX);
  const ys = Array.from({ length: Math.max(0, Math.ceil(c.square.side[1] / c.square.stepY) - 1) }, (_, i) => (i + 1) * c.square.stepY);
  const density = c.square.grid ? .12 : .48;
  c.square.marks = xs.flatMap(vx => ys.filter(() => Math.random() < density).map(vy => [c.square.x + vx, c.square.y + vy]));
};

const drawLineWidth = () => Math.min(18, Math.max(1, size * .18));

const RAMPS = [' .:-=+*#%@', ' .,:;~=+*%#@', ' .`-/\\|+=*#@', ' .:-~=<>/\\|+*#%@&', ' ,;:!|=+*#%@'];       // only lines and symbols, no letters or numbers
const asciiRows = (txt, ramp, cols) => {                          // the word is drawn small, then read cell by cell and rewritten with characters
  const cw = 4, ch = 7, w = cols * cw, h = Math.ceil(w / Math.max(1, txt.length) * 1.5 / ch) * ch;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = h * .95; x.font = `300 ${fs}px "Merriweather", Georgia, serif`;
  const mw = x.measureText(txt).width; if (mw > w * .96) { fs *= w * .96 / mw; x.font = `300 ${fs}px "Merriweather", Georgia, serif`; }
  x.fillText(txt, w / 2, h / 2);
  const d = x.getImageData(0, 0, w, h).data, rows = h / ch;
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, k) => {
    const cov = Array.from({ length: cw * ch }, (_, i) => d[(((r * ch + Math.floor(i / cw)) * w) + k * cw + i % cw) * 4 + 3]).reduce((u, v) => u + v, 0) / (cw * ch) / 255;
    return ramp[Math.min(ramp.length - 1, Math.floor(Math.sqrt(cov) * ramp.length * 1.05))];
  }).join(''));
};

const bigText = (c, p) => {                                       // big word on top of everything, written in ASCII characters
  const box = document.getElementById('bigtext'), txt = ((box && box.value.trim()) || choice(BIG_TEXT)).toUpperCase().slice(0, 14);
  const cols = Math.min(150, Math.max(40, txt.length * 14)), cwu = bigSize * txt.length * 1.6 / cols;
  const rows = asciiRows(txt, choice(RAMPS), cols), k = Math.min(1, (W0 - 2 * EDGE - 12) / (cols * cwu), (H0 - 2 * EDGE - 12) / (rows.length * cwu * 1.83)), cw = cwu * k;
  const hw = cols * cw / 2 + 6, hh = rows.length * cw * 1.83 / 2 + 6;
  add({ big: true, rows, x: clamp(p[0], EDGE + hw, W0 - EDGE - hw), y: clamp(p[1], EDGE + hh, H0 - EDGE - hh), cwu: cw, rot: R(-.05, .05) });
};

/* ---------------------------------------------------------------- drawing and export */

const smoothPath = (c, p) => {                                    // rounded outline through the midpoints
  const n = p.length;
  c.moveTo((p[0][0] + p[n - 1][0]) / 2, (p[0][1] + p[n - 1][1]) / 2);
  p.forEach((q, i) => { const r = p[(i + 1) % n]; c.quadraticCurveTo(q[0], q[1], (q[0] + r[0]) / 2, (q[1] + r[1]) / 2); });
  c.closePath();
};

const renderItem = (c, it) => {
  if (it.dead) { return; }
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (it.square) {
    if (it.grid && it.foreground) {
      if (bg === 0) {
        c.clearRect(it.x, it.y, it.side[0], it.side[1]);
      } else {
        c.fillStyle = bg === 2 ? '#000' : '#fff';
        c.fillRect(it.x, it.y, it.side[0], it.side[1]);
      }
    }
    if (it.grid) {
      c.lineWidth = it.lw; c.strokeStyle = tintAlpha(it.col, it.lineAlpha);
      c.strokeRect(it.x, it.y, it.side[0], it.side[1]);
      it.pts.forEach(path => { c.beginPath(); c.moveTo(path[0][0], path[0][1]); c.lineTo(path[1][0], path[1][1]); c.stroke(); });
    }
    it.marks.forEach(p => { c.fillStyle = tint(INK); c.fillRect(p[0] - 3, p[1] - 3, 6, 6); });
    return;
  }
  if (it.rows) {
    c.save(); c.translate(it.x, it.y); c.rotate(it.rot); c.textBaseline = 'top'; c.textAlign = 'left';
    const fs = it.cwu / .6, lh = it.cwu * 1.83;
    c.font = `300 ${fs}px "Merriweather", Georgia, serif`;
    const x0 = -it.rows[0].length * it.cwu / 2, y0 = -it.rows.length * lh / 2;
    c.lineWidth = .55; c.strokeStyle = tint(BIGINK);
    it.rows.forEach((l, k) => { c.strokeText(l, x0, y0 + k * lh); });
    c.restore(); return;
  }
  if (it.lines) {
    c.save(); c.translate(it.x, it.y);
    if (it.mode & 1) { c.rotate(Math.PI); } if (it.mode & 2) { c.scale(-1, 1); }
    c.font = `300 ${it.size}px "Merriweather", Georgia, serif`; c.textBaseline = 'middle';
    it.lines.forEach((l, k) => {
      const y = k * (it.lh || it.size * 1.4);
      if (it.halo) { c.lineWidth = 3.5; c.strokeStyle = WHITEF; c.strokeText(l, 0, y); }
      c.fillStyle = tint(TXT); c.fillText(l, 0, y);
    });
    c.restore(); return;
  }
  c.beginPath();
  (it.multi ? it.pts : [it.pts]).forEach(path => {
    if (it.smooth && it.closed && path.length > 3) { smoothPath(c, path); return; }
    path.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]));
    if (it.closed && path.length) { c.closePath(); }
  });
  if (it.fill) { c.fillStyle = tintAlpha(it.fill, it.fillAlpha); c.fill(); }
  if (it.lw) { c.lineWidth = it.lw; c.strokeStyle = tintAlpha(it.col, it.lineAlpha); c.stroke(); }
};
const tint = v => PAL[v] || v;                                    // the chosen colour, applied when drawing (so C recolours everything)
const tintAlpha = (v, alpha = 1) => {
  const color = tint(v);
  if (!color || alpha === 1) { return color; }
  const match = /rgba\(([^)]+)\)/.exec(color);
  if (!match) { return color; }
  const parts = match[1].split(',');
  return `rgba(${parts.slice(0, 3).join(',')},${Math.max(0, Math.min(1, Number(parts[3]) * alpha))})`;
};

const savePNG = () => {
  settle();
  const W = Math.round(SIZE_MM[0] / 25.4 * DPI), H = Math.round(SIZE_MM[1] / 25.4 * DPI);
  if (W * H > 150e6) { alert('Too large for the browser: lower DPI or size.'); return; }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.scale(W / W0, W / W0);
  if (bg) { x.fillStyle = bg === 1 ? '#fff' : '#000'; x.fillRect(0, 0, W0, H0); }
  items.filter(o => !o.big && !o.foreground && !o.aboveGrid && !o.dead).forEach(o => renderItem(x, o));
  items.filter(o => o.foreground && !o.big && !o.aboveGrid && !o.dead).forEach(o => renderItem(x, o));
  items.filter(o => o.aboveGrid && !o.big && !o.dead).forEach(o => renderItem(x, o));
  items.filter(o => o.big).forEach(o => renderItem(x, o));
  c.toBlob(async blob => {
    download(new Blob([withDpi(new Uint8Array(await blob.arrayBuffer()), DPI)], { type: 'image/png' }), `radio-lines_${DPI}dpi.png`);
  }, 'image/png');
};

const download = (blob, name) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
};

const withDpi = (bytes, dpi) => {                                 // writes the dpi into the PNG (pHYs chunk)
  const ppm = Math.round(dpi / 0.0254), ch = new Uint8Array(21), dv = new DataView(ch.buffer);
  dv.setUint32(0, 9); ch.set([0x70, 0x48, 0x59, 0x73], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); ch[16] = 1;
  let crc = 0xFFFFFFFF;
  each(13, i => { crc ^= ch[i + 4]; each(8, () => { crc = crc & 1 ? 0xEDB88320 ^ (crc >>> 1) : crc >>> 1; }); });
  dv.setUint32(17, (crc ^ 0xFFFFFFFF) >>> 0);
  const out = new Uint8Array(bytes.length + 21);
  out.set(bytes.subarray(0, 33)); out.set(ch, 33); out.set(bytes.subarray(33), 54);
  return out;
};

/* brushes (defined last because they refer to the functions above) */
const BR = {
  drawline: { step: 1, begin: drawLineBegin, move: drawLineMove },
  square:  { step: 2, begin: squareBegin, move: squareMove },
  spikes: { step: 7, begin(c) { c.sp = []; c.hd = 0; c.hol = Math.random() < .35; c.body = add(ink({ pts: [] }, c.hol)); c.hold.push(c.body); }, move: spikeMove },
  maps:   { step: 4, begin(c) { c.acc = 1e9; c.hd = 0; }, move: mapMove },
  lines:  { step: 3, begin(c, p) { c.g = [snap(p)]; c.dist = 0; c.d = [1, 0]; c.wire = add({ pts: [c.g[0].slice()], lw: .8, col: LINE }); c.hold.push(c.wire); }, move: lineMove },
  text:   { step: 1e9, begin: textBlock, move() { } },
  big:    { step: 1e9, begin: bigText, move() { } },
};