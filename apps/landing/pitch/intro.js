// Moon Care intro animation, by Alex (apps/landing/moon-care-landing.html).
// Adapted for the pitch page: draws inside the hero section instead of the whole window,
// pauses when the hero is off screen, and takes its tagline from the page language.
(function () {
// =====================================================================
//  Settings
// =====================================================================
let TAGLINE         = ['A DAILY HEALTH PANEL', 'FOR LIFE BEYOND EARTH'];   // set per language by setIntroTagline()
const MOON_LOOP_S    = 8;       // seconds for one full phase cycle and one full turn of the logo moon
const EARTH_FINAL_D  = 0.15;    // final Earth diameter as a fraction of the screen width
const EARTH_START_S  = 0.5;     // when the camera starts to drift away from the Earth
const EARTH_END_S    = 12;      // when the Earth reaches its corner
const LOGO_FADE_IN_S = [2.5, 5.5];
const STAR_SPIN      = 0.012;   // radians per second (very slow)

// =====================================================================
//  Setup
// =====================================================================
const params = new URLSearchParams(location.search);
const canvas = document.getElementById('intro');
const host = canvas.parentElement;
const ctx = canvas.getContext('2d');
let isDark = true;
const fixedAt = params.has('at') ? parseFloat(params.get('at')) : null;   // freeze the scene at a time (for screenshots)

let W, H, dpr;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2) * (params.has('scale') ? +params.get('scale') : 1);
  const r = host.getBoundingClientRect(); W = Math.round(r.width); H = Math.round(r.height);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  if (!running()) renderStatic();
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// =====================================================================
//  Logo: MOON over CARE, the second O is a moon that goes through its phases
// =====================================================================
const D2R = Math.PI / 180;
const marks = [
  { lon: -25, lat: 30, r: 22, k: 'm' }, { lon: 12, lat: 24, r: 17, k: 'm' }, { lon: 40, lat: 8, r: 15, k: 'm' },
  { lon: -52, lat: -4, r: 19, k: 'm' }, { lon: -12, lat: -18, r: 14, k: 'm' }, { lon: 22, lat: -30, r: 10, k: 'm' },
  { lon: 75, lat: -12, r: 9, k: 'm' }, { lon: 105, lat: 30, r: 12, k: 'm' }, { lon: 140, lat: -8, r: 15, k: 'm' },
  { lon: 170, lat: 28, r: 11, k: 'm' }, { lon: 205, lat: -26, r: 17, k: 'm' }, { lon: 235, lat: 14, r: 13, k: 'm' },
  { lon: 270, lat: -6, r: 10, k: 'm' }, { lon: 300, lat: 34, r: 12, k: 'm' },
  { lon: -12, lat: -52, r: 8, k: 'c' }, { lon: 30, lat: -50, r: 6, k: 'c' }, { lon: 60, lat: 38, r: 5, k: 'c' },
  { lon: -70, lat: 34, r: 5, k: 'c' }, { lon: 3, lat: -4, r: 6, k: 'c' }, { lon: -38, lat: -34, r: 5, k: 'c' },
  { lon: 55, lat: -20, r: 4, k: 'c' }, { lon: -30, lat: 60, r: 5, k: 'c' }, { lon: 88, lat: 10, r: 5, k: 'c' },
  { lon: 120, lat: -40, r: 7, k: 'c' }, { lon: 150, lat: 50, r: 5, k: 'c' }, { lon: 185, lat: 5, r: 6, k: 'c' },
  { lon: 222, lat: 48, r: 5, k: 'c' }, { lon: 255, lat: -40, r: 7, k: 'c' }, { lon: 285, lat: 20, r: 4, k: 'c' },
  { lon: 320, lat: -15, r: 6, k: 'c' }, { lon: 340, lat: 45, r: 5, k: 'c' },
].map(m => ({ lon: m.lon * D2R, lat: m.lat * D2R, r: m.r * D2R, k: m.k }));

function litPath(c, R, phase) {                       // origin at the moon centre
  const k = Math.cos(phase * Math.PI * 2);            // 1 new ... -1 full
  c.save();
  if (phase >= 0.5) c.scale(-1, 1);                   // waning: light on the left
  c.beginPath();
  c.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
  for (let i = 0; i <= 48; i++) {
    const t = Math.PI / 2 - (i / 48) * Math.PI;
    c.lineTo(R * k * Math.cos(t), R * Math.sin(t));
  }
  c.closePath();
  c.restore();
}

const moonCanvas = document.createElement('canvas');
function drawMoon(c, mx, my, R, progress, ink, scalePx, ring) {
  // The moon is drawn on its own canvas so the craters are real holes (transparent), not a flat colour.
  const dims = 2 * R + 12;
  const px = Math.ceil(dims * scalePx);
  if (moonCanvas.width !== px) { moonCanvas.width = px; moonCanvas.height = px; }
  const m = moonCanvas.getContext('2d');
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.clearRect(0, 0, px, px);
  m.setTransform(px / dims, 0, 0, px / dims, px / 2, px / 2);

  m.strokeStyle = ring || ink; m.globalAlpha = ring ? 0.95 : 0.55; m.lineWidth = ring ? 2.4 : 1.6;           // dark side outline
  m.beginPath(); m.arc(0, 0, R, 0, Math.PI * 2); m.stroke();
  m.globalAlpha = 1;

  m.save();
  litPath(m, R, progress); m.clip();
  m.fillStyle = ink; m.fillRect(-R - 2, -R - 2, 2 * R + 4, 2 * R + 4);
  m.globalCompositeOperation = 'destination-out';
  m.strokeStyle = '#000'; m.fillStyle = '#000';
  const spin = progress * Math.PI * 2;
  for (const k of marks) {
    const lon = k.lon + spin, cl = Math.cos(lon);
    if (cl <= 0.04) continue;
    const x = R * Math.cos(k.lat) * Math.sin(lon), y = -R * Math.sin(k.lat);
    m.beginPath();
    m.ellipse(x, y, Math.max(R * Math.sin(k.r) * cl, 0.5), R * Math.sin(k.r), 0, 0, Math.PI * 2);
    if (k.k === 'm') m.fill(); else { m.lineWidth = 1.4; m.stroke(); }
  }
  m.restore();

  m.strokeStyle = ink; m.lineWidth = 1.6;                                  // terminator stroke
  litPath(m, R, progress); m.stroke();

  c.drawImage(moonCanvas, mx - dims / 2, my - dims / 2, dims, dims);
}

function drawTracked(c, text, cx, y, spacing) {
  let w = -spacing;
  for (const ch of text) w += c.measureText(ch).width + spacing;
  let x = cx - w / 2;
  for (const ch of text) { c.fillText(ch, x, y); x += c.measureText(ch).width + spacing; }
}

// Logo block in local units: centred on (0,0), about 700 x 372.
function drawLogo(c, cx, cy, k, pxRatio, progress, ink, alpha) {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha = alpha;
  c.translate(cx, cy);
  c.scale(k, k);
  c.fillStyle = ink; c.strokeStyle = ink;
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';

  const FONT = '"Space Grotesk", "Segoe UI Light", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const fontPx = 112, P = 176;                                  // letter size and column pitch
  c.font = `300 ${fontPx}px ${FONT}`;
  const capH = c.measureText('M').actualBoundingBoxAscent;
  const base1 = -106, base2 = base1 + 150;
  const colX = i => (i - 1.5) * P;
  const R = capH / 2 + 1;

  const row1 = ['M', 'O', null, 'N'], row2 = ['C', 'A', 'R', 'E'];
  c.textAlign = 'center';
  // Pitch page: the app's logo colours, white at the top fading to cyan (#2fd8ff) at the bottom.
  const rowGrad = base => { const g = c.createLinearGradient(0, base - capH, 0, base); g.addColorStop(0, '#e6f1fb'); g.addColorStop(1, '#2fd8ff'); return g; };
  c.fillStyle = rowGrad(base1);
  row1.forEach((ch, i) => { if (ch) c.fillText(ch, colX(i), base1); });
  c.fillStyle = rowGrad(base2);
  row2.forEach((ch, i) => c.fillText(ch, colX(i), base2));
  c.textAlign = 'left';
  const mx = colX(2), my = base1 - capH / 2;
  // the glow follows how much of the moon is lit: gone at new moon, brightest at full moon
  const lit = (1 - Math.cos(progress * Math.PI * 2)) / 2;
  if (lit > 0.01) {
    const gr = R * (1.6 + 1.0 * lit);
    const glow = c.createRadialGradient(mx, my, 0, mx, my, gr);
    glow.addColorStop(0, `rgba(47,216,255,${(0.45 * Math.pow(lit, 0.8)).toFixed(3)})`); glow.addColorStop(1, 'rgba(47,216,255,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(mx, my, gr, 0, Math.PI * 2); c.fill();
  }
  drawMoon(c, mx, my, R, progress, '#d8f6ff', k * pxRatio, '#2fd8ff');
  c.fillStyle = ink; c.strokeStyle = '#2fd8ff';

  c.globalAlpha = alpha * 0.35; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-60, base2 + 48); c.lineTo(60, base2 + 48); c.stroke();
  c.globalAlpha = alpha;
  // Pitch page: shrink the tagline if a translated line would run past the screen edges.
  c.font = `400 26px ${FONT}`;
  const k0 = c.getTransform().a || 1, maxW = (W * 0.9 * pxRatio) / k0;
  const widest = Math.max(...TAGLINE.map(l => c.measureText(l).width + 10 * (l.length - 1)));
  const f = Math.min(1, maxW / widest);
  c.font = `400 ${26 * f}px ${FONT}`;
  TAGLINE.forEach((line, i) => drawTracked(c, line, 0, base2 + 104 + i * 38, 10 * f));
  c.restore();
}

const logoScale = () => Math.min(W * (W < 700 ? 0.80 : 0.56) / 700, H * 0.40 / 372, 1.6);
const logoCenter = () => [W / 2, H * (W < 700 ? 0.33 : 0.37)];

// =====================================================================
//  Stars: very slow rotation, twinkle, a few sparkle
// =====================================================================
const stars = (() => {
  const rnd = mulberry32(7), list = [];
  for (let i = 0; i < 1800; i++) {
    const big = rnd() < 0.06;
    list.push({
      a: rnd() * Math.PI * 2, r: Math.sqrt(rnd()),
      s: big ? 1.3 + rnd() * 0.9 : 0.4 + rnd() * 0.8,
      b: big ? 0.8 + rnd() * 0.2 : 0.25 + rnd() * 0.6,
      tw: 0.6 + rnd() * 2.2, ph: rnd() * 6.28,
      col: rnd() < 0.7 ? 0 : (rnd() < 0.5 ? 1 : 2),
      spark: rnd() < 0.07, per: 5 + rnd() * 9, sph: rnd(),
    });
  }
  return list;
})();
const STAR_COL = ['#ffffff', '#bcd4ff', '#ffe6bf'];

function drawStars(t, e) {
  const cx = W / 2, cy = H / 2, maxR = Math.hypot(W, H) / 2 * 1.03;
  const n = Math.min(stars.length, Math.floor(W * H / 2600));
  const px = (1 - e) * W * 0.045, py = -(1 - e) * H * 0.03;     // small parallax during the camera shift
  const fadeIn = smooth(0, 1.2, t);
  for (let i = 0; i < n; i++) {
    const s = stars[i];
    const ang = s.a + t * STAR_SPIN;
    const x = cx + Math.cos(ang) * s.r * maxR + px, y = cy + Math.sin(ang) * s.r * maxR + py;
    if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
    const tw = 0.72 + 0.28 * Math.sin(t * s.tw + s.ph);
    ctx.globalAlpha = s.b * tw * fadeIn;
    ctx.fillStyle = STAR_COL[s.col];
    if (s.s < 1.2) ctx.fillRect(x - s.s / 2, y - s.s / 2, s.s, s.s);
    else { ctx.beginPath(); ctx.arc(x, y, s.s / 2 + 0.2, 0, 6.2832); ctx.fill(); }
    if (s.spark) {
      const f = ((t / s.per) + s.sph) % 1;
      if (f < 0.14) {
        const k = Math.sin(f / 0.14 * Math.PI), L = (7 + s.s * 5) * k;
        ctx.globalAlpha = 0.85 * k * fadeIn; ctx.strokeStyle = STAR_COL[s.col]; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// =====================================================================
//  Meteors: showers every ~20 s and a lone one now and then. Pre-computed from a seed, so they are repeatable.
// =====================================================================
const meteors = (() => {
  const list = [], rnd = mulberry32(2026);
  const add = (t0, big) => list.push({
    t0, dur: 0.55 + rnd() * 0.6, x0: 0.25 + rnd() * 0.95, y0: -0.12 + rnd() * 0.55,
    ang: Math.PI - 0.45 + (big ? (rnd() - 0.5) * 0.12 : (rnd() - 0.5) * 0.5),
    speed: 1000 + rnd() * 700, len: 130 + rnd() * 160, w: 1 + rnd() * 1.1,
  });
  let t = 7;                                              // showers
  while (t < 3600) {
    const n = 5 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) add(t + rnd() * 3.5, true);
    t += 15 + rnd() * 14;
  }
  t = 4;                                                  // lone meteors
  while (t < 3600) { add(t, false); t += 6 + rnd() * 9; }
  return list;
})();

function drawMeteors(t) {
  const sc = W / 1280;
  ctx.lineCap = 'round';
  for (const m of meteors) {
    const age = t - m.t0;
    if (age < 0 || age > m.dur) continue;
    const p = age / m.dur, env = Math.sin(p * Math.PI);
    const dx = Math.cos(m.ang), dy = Math.sin(m.ang), d = m.speed * sc * age;
    const hx = m.x0 * W + dx * d, hy = m.y0 * H + dy * d, L = m.len * sc * (0.4 + 0.6 * env);
    const tx = hx - dx * L, ty = hy - dy * L;
    const g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.95 * env) + ')');
    g.addColorStop(0.25, 'rgba(190,215,255,' + (0.45 * env) + ')');
    g.addColorStop(1, 'rgba(150,190,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = m.w * Math.max(0.8, sc);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.globalAlpha = 0.8 * env; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(hx, hy, 1.1 * Math.max(0.8, sc), 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
  }
}

// =====================================================================
//  Earth: procedural, semi-realistic (continents, ocean depth, ice caps, clouds, night lights, atmosphere)
//  Pitch page: smooth (bilinear) sampling, a quick low-detail map at start, and a sharper map
//  built in small slices in the background so the page never freezes.
// =====================================================================
const S = (innerWidth < 700 ? 600 : (devicePixelRatio > 1.4 && innerWidth > 1100 ? 840 : 760));
let earthReady = false;
let tex = null;                       // current maps: { TW, TH, CW, CH, rgb, ocean, lights, cloud }
let eDiff, eSpec, eRim, eDay, eFu, eFv, eAlpha;
const earthCanvas = document.createElement('canvas'); earthCanvas.width = earthCanvas.height = S;
const earthCtx = earthCanvas.getContext('2d');
const earthImg = earthCtx.createImageData(S, S);

// Self-contained Earth map builder. Used on the page for a quick first map and, as a Web Worker,
// to build the detailed maps on another thread so the animation never stutters.
function earthMapKit() {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // --- 3D value noise ---
  const rnd = mulberry32(1969), PERM = new Uint8Array(512), LAT = new Float32Array(256);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = base[i & 255];
  for (let i = 0; i < 256; i++) LAT[i] = rnd();
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const hv = (a, b, c) => LAT[PERM[PERM[PERM[a] + b] + c]];
  function vn(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi, X = xi & 255, Y = yi & 255, Z = zi & 255;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const x00 = lerp(hv(X, Y, Z), hv(X + 1, Y, Z), u), x10 = lerp(hv(X, Y + 1, Z), hv(X + 1, Y + 1, Z), u);
    const x01 = lerp(hv(X, Y, Z + 1), hv(X + 1, Y, Z + 1), u), x11 = lerp(hv(X, Y + 1, Z + 1), hv(X + 1, Y + 1, Z + 1), u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  }
  function fbm(x, y, z, oct) {
    let a = 0.5, s = 0, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vn(x * f, y * f, z * f); n += a; f *= 2.03; a *= 0.5; }
    return s / n;
  }
  const THR = 0.535;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // builds the maps one row at a time, so it can run in slices
  function* makeMaps(TW, TH, CW, CH) {
    const m = { TW, TH, CW, CH, rgb: new Uint8Array(TW * TH * 3), ocean: new Uint8Array(TW * TH), lights: new Uint8Array(TW * TH), cloud: new Uint8Array(CW * CH) };
    for (let v = 0; v < TH; v++) {
      const lat = (0.5 - (v + 0.5) / TH) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat), alat = Math.abs(lat);
      for (let u = 0; u < TW; u++) {
        const lon = ((u + 0.5) / TW) * Math.PI * 2 - Math.PI;
        const x = cl * Math.sin(lon), y = sl, z = cl * Math.cos(lon);
        const warp = 0.22 * (fbm(x * 3.1 + 9, y * 3.1 + 4, z * 3.1 + 1, 4) - 0.5);
        const detail = TW > 1000 ? 0.035 * (fbm(x * 24 + 2, y * 24 + 7, z * 24 + 5, 3) - 0.5) : 0;
        const n = fbm(x * 1.55 + 3, y * 1.55 + 5, z * 1.55 + 7, TW > 1000 ? 8 : 6) + warp + detail;
        const i = v * TW + u;
        let col, ocean = 0, lights = 0;
        if (n > THR) {
          const e = clamp((n - THR) / (1 - THR) * 2.2);
          const moist = fbm(x * 2.4 + 20, y * 2.4 + 11, z * 2.4 + 3, 4);
          const tint = TW > 1000 ? fbm(x * 9 + 31, y * 9 + 17, z * 9 + 3, 3) : 0.5;
          col = mix([38, 76, 40], [86, 120, 62], smooth(0.35, 0.65, moist));
          col = mix(col, [58, 92, 50], smooth(0.4, 0.7, tint) * 0.6);                 // forest and grassland patches
          const band = smooth(0.1, 0.32, alat) * (1 - smooth(0.5, 0.75, alat));
          col = mix(col, [196, 162, 112], band * smooth(0.58, 0.4, moist));            // desert belts
          col = mix(col, [150, 126, 96], band * smooth(0.5, 0.35, moist) * smooth(0.3, 0.7, tint) * 0.6);
          col = mix(col, [112, 100, 90], smooth(0.5, 0.8, e));                        // mountains
          const snow = Math.max(smooth(1.05, 1.3, alat + 0.12 * (moist - 0.5)), smooth(0.8, 1.0, e));
          col = mix(col, [238, 242, 247], snow);
          const city = fbm(x * 16, y * 16, z * 16, 2);
          if (alat < 1.15 && e < 0.45 && city > 0.58) lights = Math.round(255 * smooth(0.58, 0.72, city) * (1 - smooth(0.2, 0.45, e)));
        } else {
          const depth = clamp((THR - n) / 0.28);
          col = mix([36, 118, 168], [6, 26, 72], Math.pow(depth, 0.6));
          col = mix(col, [64, 160, 182], (1 - smooth(0, 0.08, depth)) * 0.55);          // turquoise shallows along coasts
          ocean = 1;
          const ice = smooth(1.2, 1.38, alat + 0.12 * (fbm(x * 4, y * 4, z * 4, 3) - 0.5));
          if (ice > 0) { col = mix(col, [236, 242, 248], ice); ocean = ice > 0.5 ? 0 : 1; }
        }
        m.rgb[i * 3] = col[0]; m.rgb[i * 3 + 1] = col[1]; m.rgb[i * 3 + 2] = col[2];
        m.ocean[i] = ocean; m.lights[i] = lights;
      }
      yield;
    }
    for (let v = 0; v < CH; v++) {
      const lat = (0.5 - (v + 0.5) / CH) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (let u = 0; u < CW; u++) {
        const lon = ((u + 0.5) / CW) * Math.PI * 2 - Math.PI;
        const x = cl * Math.sin(lon), y = sl, z = cl * Math.cos(lon);
        const q = CW > 600 ? 0.5 * (fbm(x * 3.3 + 2, y * 3.3 + 9, z * 3.3 + 4, 3) - 0.5) : 0;
        const c = fbm(x * 2.1 + 40 + q, y * 3.2 + 8 + q, z * 2.1 + 19 - q, CW > 600 ? 7 : 5);
        m.cloud[v * CW + u] = Math.round(255 * 0.9 * smooth(0.5, 0.72, c));
      }
      yield;
    }
    return m;
  }

  return {
    gen: makeMaps,
    make(TW, TH, CW, CH) { const g = makeMaps(TW, TH, CW, CH); let r; do { r = g.next(); } while (!r.done); return r.value; }
  };
}

function buildEarth() {
  const kit = earthMapKit();
  // quick low-detail maps now ...
  tex = kit.make(384, 192, 256, 128);
  // ... then a medium and a detailed map, built off the main thread when possible
  const swap = m => { tex = m; lastEarthUpdate = -1; };
  const jobs = [[1024, 512, 768, 384], [2048, 1024, 1536, 768]];
  let worker = null;
  try {
    const src = 'const kit = (' + earthMapKit.toString() + ')();\n' +
      'onmessage = e => { const m = kit.make.apply(null, e.data); postMessage(m, [m.rgb.buffer, m.ocean.buffer, m.lights.buffer, m.cloud.buffer]); };';
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    let n = 0;
    worker.onmessage = e => { swap(e.data); n++; if (n < jobs.length) worker.postMessage(jobs[n]); else { worker.terminate(); window.MoonCareEarthSharp = true; } };
    worker.onerror = () => { worker = null; inPage(); };
    worker.postMessage(jobs[0]);
  } catch (err) { worker = null; inPage(); }
  // fallback without workers: build in small slices on the page
  function inPage() {
    let j = 0;
    const next = () => {
      if (j >= jobs.length) { window.MoonCareEarthSharp = true; return; }
      const g = kit.gen.apply(null, jobs[j++]);
      const slice = () => {
        const end = performance.now() + 8; let st;
        do { st = g.next(); } while (!st.done && performance.now() < end);
        if (st.done) { swap(st.value); next(); } else setTimeout(slice, 16);
      };
      setTimeout(slice, 200);
    };
    next();
  }

  // --- per-pixel sphere tables (they only depend on the view, so they are computed once) ---
  const N = S * S;
  eDiff = new Float32Array(N); eSpec = new Float32Array(N); eRim = new Float32Array(N); eDay = new Float32Array(N);
  eFu = new Float32Array(N); eFv = new Float32Array(N); eAlpha = new Uint8Array(N);
  const roll = -0.38, pitch = 0.42, cr = Math.cos(roll), sr = Math.sin(roll), cp = Math.cos(pitch), sp = Math.sin(pitch);
  let L = [-0.72, 0.42, 0.55]; const ll = Math.hypot(...L); L = L.map(q => q / ll);
  const Hh = [L[0], L[1], L[2] + 1]; const hl = Math.hypot(...Hh); const Hv = Hh.map(q => q / hl);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, nx = (x + 0.5 - S / 2) / (S / 2), ny = -(y + 0.5 - S / 2) / (S / 2), r2 = nx * nx + ny * ny;
    if (r2 >= 1) { eAlpha[i] = 0; continue; }
    const rr = Math.sqrt(r2), nz = Math.sqrt(1 - r2);
    eAlpha[i] = Math.round(255 * clamp((1 - rr) * S * 0.5));
    const dp = nx * L[0] + ny * L[1] + nz * L[2];
    const dayS = smooth(-0.1, 0.6, dp);
    eDay[i] = smooth(-0.12, 0.3, dp);
    eDiff[i] = 0.07 + 0.93 * dayS;
    eSpec[i] = Math.pow(Math.max(0, nx * Hv[0] + ny * Hv[1] + nz * Hv[2]), 70) * 0.7 * eDay[i];
    eRim[i] = Math.pow(1 - nz, 2.6) * (0.25 + 0.75 * dayS);
    const x2 = nx * cr - ny * sr, y2 = nx * sr + ny * cr;
    const y3 = y2 * cp - nz * sp, z3 = y2 * sp + nz * cp;
    const lat = Math.asin(clamp(y3, -1, 1)), lon = Math.atan2(x2, z3);
    eFu[i] = (lon + Math.PI) / (Math.PI * 2); eFv[i] = clamp(0.5 - lat / Math.PI, 0, 0.9999);
  }
  earthReady = true;
}

function renderEarth(rot, cloudRot) {
  if (!earthReady) buildEarth();
  const d = earthImg.data, T = tex, TW = T.TW, TH = T.TH, CW = T.CW, CH = T.CH;
  const rgb = T.rgb, oc = T.ocean, li = T.lights, cl = T.cloud;
  const wrap = (v, m) => ((v % m) + m) % m;
  const sh = wrap(-rot / (Math.PI * 2) * TW, TW), shc = wrap(-cloudRot / (Math.PI * 2) * CW, CW);
  for (let i = 0, N = S * S; i < N; i++) {
    const a = eAlpha[i], o = i * 4;
    if (a === 0) { d[o + 3] = 0; continue; }
    // bilinear sampling of the surface map and the clouds (smooth coastlines, soft clouds)
    let u = eFu[i] * TW - 0.5 + sh; if (u < 0) u += TW; if (u >= TW) u -= TW;
    let tv = eFv[i] * TH - 0.5; if (tv < 0) tv = 0; if (tv > TH - 1.001) tv = TH - 1.001;
    const u0 = u | 0, u1 = u0 + 1 === TW ? 0 : u0 + 1, fu = u - u0, v0 = tv | 0, fv = tv - v0;
    const r0 = v0 * TW, r1 = r0 + TW;
    const k00 = (r0 + u0) * 3, k10 = (r0 + u1) * 3, k01 = (r1 + u0) * 3, k11 = (r1 + u1) * 3;
    const w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w01 = (1 - fu) * fv, w11 = fu * fv;
    let r = rgb[k00] * w00 + rgb[k10] * w10 + rgb[k01] * w01 + rgb[k11] * w11;
    let g = rgb[k00 + 1] * w00 + rgb[k10 + 1] * w10 + rgb[k01 + 1] * w01 + rgb[k11 + 1] * w11;
    let b = rgb[k00 + 2] * w00 + rgb[k10 + 2] * w10 + rgb[k01 + 2] * w01 + rgb[k11 + 2] * w11;
    const ti = (fv < 0.5 ? r0 : r1) + (fu < 0.5 ? u0 : u1);
    let uc = eFu[i] * CW - 0.5 + shc; if (uc < 0) uc += CW; if (uc >= CW) uc -= CW;
    let tc = eFv[i] * CH - 0.5; if (tc < 0) tc = 0; if (tc > CH - 1.001) tc = CH - 1.001;
    const c0 = uc | 0, c1 = c0 + 1 === CW ? 0 : c0 + 1, fc = uc - c0, cv0 = tc | 0, fvc = tc - cv0, rc0 = cv0 * CW, rc1 = rc0 + CW;
    const ca = ((cl[rc0 + c0] * (1 - fc) + cl[rc0 + c1] * fc) * (1 - fvc) + (cl[rc1 + c0] * (1 - fc) + cl[rc1 + c1] * fc) * fvc) / 255;
    const lit = eDiff[i];
    r = (r * (1 - ca) + 255 * ca) * lit; g = (g * (1 - ca) + 255 * ca) * lit; b = (b * (1 - ca) + 255 * ca) * lit;
    const sp = oc[ti] * eSpec[i] * (1 - ca) * 255; r += sp; g += sp; b += sp * 0.95;
    const city = li[ti] * (1 - eDay[i]) * (1 - ca * 0.9) / 255;
    r += 255 * city; g += 170 * city; b += 70 * city;
    const rim = eRim[i] * 0.9; r += 70 * rim; g += 130 * rim; b += 255 * rim;
    d[o] = r > 255 ? 255 : r; d[o + 1] = g > 255 ? 255 : g; d[o + 2] = b > 255 ? 255 : b; d[o + 3] = a;
  }
  earthCtx.putImageData(earthImg, 0, 0);
}

let lastEarthUpdate = -1;
function earthGeometry(e) {
  const Rf = EARTH_FINAL_D * W / 2;
  const R0 = Math.max(Math.min(W, H) * 0.4, Rf * 3);                 // pitch page: start with the whole Earth in view
  const cx0 = W * 0.5, cy0 = H * 0.5;
  // pitch page: the Earth ends rising over the Moon's horizon (see drawLunarSurface)
  const cx1 = W < 700 ? W - Rf * 1.6 : W * 0.8;
  const cy1 = lunarHorizonY(cx1, 1) - Rf * 0.62;
  return { R: R0 * Math.pow(Rf / R0, e), cx: lerp(cx0, cx1, e), cy: lerp(cy0, cy1, e) };
}

function drawEarth(t, e) {
  const { R, cx, cy } = earthGeometry(e);
  if (cy - R > H || cx + R < 0) return;
  const now = performance.now();
  // redraw fast only while the Earth is big on screen; a small far-off Earth needs few updates
  if (fixedAt !== null || now - lastEarthUpdate > (R > 260 ? 85 : 220) || lastEarthUpdate < 0) {
    renderEarth(t * 0.07, t * 0.085); lastEarthUpdate = now;
  }
  const appear = smooth(0, 1.2, t);
  ctx.globalAlpha = appear;
  const g = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.22);   // atmosphere glow
  g.addColorStop(0, 'rgba(90,150,255,0.42)'); g.addColorStop(0.35, 'rgba(70,120,230,0.14)'); g.addColorStop(1, 'rgba(60,110,230,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 6.2832); ctx.fill();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(earthCanvas, cx - R, cy - R, R * 2, R * 2);
  ctx.globalAlpha = 1;
}

// =====================================================================
//  Pitch page: Earthrise. As the camera pulls away from the Earth, the Moon's surface rises
//  from the bottom of the screen and the Earth ends up hanging just above the lunar horizon.
// =====================================================================
const lunarR = () => Math.max(W * 2.4, 2200);
const lunarApex = rise => lerp(H + 40, H * (W < 700 ? 0.86 : 0.8), rise);
function lunarHorizonY(x, rise) {
  const Rm = lunarR(), dx = x - W / 2;
  return lunarApex(rise) + (Rm - Math.sqrt(Math.max(0, Rm * Rm - dx * dx)));
}
// The surface is painted once (per screen size) into an offscreen canvas at its final position,
// then simply moved up during the rise, so the detail costs nothing per frame.
let lunarCache = null, lunarKey = '';
function lunarHills(x) {
  const k = W / 1440 + 0.4;
  return (Math.sin(x * 0.011 + 1.3) * 2.2 + Math.sin(x * 0.027 + 4.1) * 1.4 + Math.sin(x * 0.0043 + 0.7) * 3.2) * k;
}
function buildLunar() {
  const A = lunarApex(1), Rm = lunarR(), top = A - 14, Hs = Math.ceil(H - top + 2);
  const cvs = document.createElement('canvas');
  cvs.width = Math.max(1, Math.round(W * dpr)); cvs.height = Math.max(1, Math.round(Hs * dpr));
  const c = cvs.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
  const hy = x => A + (Rm - Math.sqrt(Math.max(0, Rm * Rm - (x - W / 2) ** 2))) - lunarHills(x);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ground shape with low hills on the horizon
  c.beginPath(); c.moveTo(0, H + 2);
  for (let x = 0; x <= W; x += 6) c.lineTo(x, hy(x));
  c.lineTo(W, hy(W)); c.lineTo(W, H + 2); c.closePath();
  c.save(); c.clip();

  // base light: bright, low sun near the horizon, darker towards the viewer
  const depth = H - A;
  let g = c.createLinearGradient(0, A - 6, 0, H);
  g.addColorStop(0, '#aeaba5'); g.addColorStop(0.14, '#8b8882'); g.addColorStop(0.5, '#5d5b57'); g.addColorStop(1, '#302f2d');
  c.fillStyle = g; c.fillRect(0, top, W, Hs);
  // light from the left, falling off to the right
  g = c.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(255,248,235,0.10)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.28)');
  c.fillStyle = g; c.fillRect(0, top, W, Hs);

  // maria: broad darker basalt plains, squashed by perspective
  for (let i = 0; i < 7; i++) {
    const x = rnd() * W, near = 0.15 + rnd() * 0.8, y = A + near * near * depth;
    const rx = (120 + rnd() * 260) * (W / 1440 + 0.3), ry = rx * (0.08 + 0.3 * near);
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const mg = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    mg.addColorStop(0, 'rgba(36,34,32,0.16)'); mg.addColorStop(0.7, 'rgba(36,34,32,0.07)'); mg.addColorStop(1, 'rgba(36,34,32,0)');
    c.fillStyle = mg; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill(); c.restore();
  }

  // regolith grain: value noise sampled on the ground plane, so it stretches towards the horizon
  const sc = 1, nw = Math.ceil(W * sc), nh = Math.ceil(depth * sc) + 4;
  const nc = document.createElement('canvas'); nc.width = nw; nc.height = nh;
  const nctx = nc.getContext('2d'), img = nctx.createImageData(nw, nh), d = img.data;
  const P = new Uint8Array(512); for (let i = 0; i < 256; i++) P[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const tmp = P[i]; P[i] = P[j]; P[j] = tmp; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const hsh = (x, y) => P[(P[x & 255] + y) & 511] / 255;
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hsh(xi, yi), hsh(xi + 1, yi), u), lerp(hsh(xi, yi + 1), hsh(xi + 1, yi + 1), u), v); };
  for (let py = 0; py < nh; py++) {
    const near = Math.max(0.004, py / nh), dist = 1 / (near + 0.035);
    for (let px = 0; px < nw; px++) {
      const X = (px / nw - 0.5) * 9 * dist, Z = dist * 1.6;
      const n = vn(X, Z) * 0.4 + vn(X * 2.1, Z * 2.1) * 0.25 + vn(X * 4.3, Z * 4.3) * 0.2 + vn(X * 9.1, Z * 9.1) * 0.15;
      const o = (py * nw + px) * 4, v = (n - 0.5) * 2;
      if (v > 0) { d[o] = 240; d[o + 1] = 236; d[o + 2] = 228; d[o + 3] = Math.min(255, v * 46); }
      else { d[o] = 18; d[o + 1] = 16; d[o + 2] = 14; d[o + 3] = Math.min(255, -v * 60); }
    }
  }
  nctx.putImageData(img, 0, 0);
  c.imageSmoothingEnabled = true; c.drawImage(nc, 0, A - 4, W, nh / sc);

  // craters: lit from the left, so the left inner wall is in shadow and the right wall catches the sun
  const crater = (x, y, rx, squash, strength) => {
    c.save(); c.translate(x, y); c.scale(1, squash);
    if (rx > 22) {                                             // faint pale ejecta around bigger craters
      const eg = c.createRadialGradient(0, 0, rx * 0.95, 0, 0, rx * 1.9);
      eg.addColorStop(0, `rgba(220,224,230,${0.07 * strength})`); eg.addColorStop(1, 'rgba(220,224,230,0)');
      c.fillStyle = eg; c.beginPath(); c.arc(0, 0, rx * 1.9, 0, Math.PI * 2); c.fill();
    }
    const bowl = c.createLinearGradient(-rx, 0, rx, 0);
    bowl.addColorStop(0, `rgba(10,11,15,${0.5 * strength})`); bowl.addColorStop(0.4, `rgba(30,32,38,${0.26 * strength})`);
    bowl.addColorStop(0.75, `rgba(140,144,152,${0.1 * strength})`); bowl.addColorStop(1, `rgba(200,204,212,${0.22 * strength})`);
    c.fillStyle = bowl; c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
    // soft rims: a faint sunlit lip on the far side, a faint shadow towards the sun
    // a ring that is brighter on the far (right) side: the rim catching the low sun
    c.save(); c.globalAlpha = 0.16 * strength;
    c.beginPath(); c.arc(0, 0, rx * 1.14, 0, Math.PI * 2); c.arc(0, 0, rx * 0.86, 0, Math.PI * 2, true);
    const farSide = c.createLinearGradient(-rx, 0, rx, 0);
    farSide.addColorStop(0, 'rgba(225,228,234,0.15)'); farSide.addColorStop(1, 'rgba(235,238,244,1)');
    c.fillStyle = farSide; c.fill(); c.restore();
    c.restore();
  };
  const sizeK = W / 1440 + 0.35;
  const list = [];
  for (let i = 0; i < 70; i++) list.push({ n: Math.pow(rnd(), 1.3), x: rnd() * W, s: Math.pow(rnd(), 3) });
  list.sort((p, q) => p.n - q.n);                                     // far craters first
  for (const k of list) {
    const near = 0.02 + k.n * 0.98, y = A + Math.pow(near, 1.7) * depth + 3;
    if (y > H + 20) continue;
    const rx = (2 + 30 * k.s) * (0.25 + 1.4 * near) * sizeK;
    crater(k.x, Math.max(y, hy(k.x) + rx * 0.2 + 2), rx, 0.1 + 0.45 * near, 0.35 + 0.3 * Math.min(1, near * 1.6));
  }

  // dark shadow towards the viewer so the eye goes to the horizon
  g = c.createLinearGradient(0, A, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(2,4,10,0.12)'); g.addColorStop(1, 'rgba(2,4,10,0.45)');
  c.fillStyle = g; c.fillRect(0, top, W, Hs);
  c.restore();

  // crisp, sunlit horizon line
  c.beginPath(); for (let x = 0; x <= W; x += 6) (x ? c.lineTo(x, hy(x)) : c.moveTo(x, hy(x)));
  const lg = c.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(240,244,250,0.75)'); lg.addColorStop(0.6, 'rgba(225,232,242,0.45)'); lg.addColorStop(1, 'rgba(200,210,225,0.2)');
  c.strokeStyle = lg; c.lineWidth = 1.2; c.stroke();
  return { cvs, top };
}
function drawLunarSurface(t, rise) {
  if (rise <= 0.001) return;
  const key = W + 'x' + H + '@' + dpr;
  if (!lunarCache || lunarKey !== key) { lunarCache = buildLunar(); lunarKey = key; }
  const shift = lunarApex(rise) - lunarApex(1);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lunarCache.cvs, 0, Math.round((lunarCache.top + shift) * dpr));
  ctx.restore();
}

// =====================================================================
//  Scenes
// =====================================================================
const moonProgress = t => params.has('t') ? parseFloat(params.get('t')) : ((t % MOON_LOOP_S) / MOON_LOOP_S);

function drawDark(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#01030a'); g.addColorStop(1, '#091226');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const e = easeInOut(clamp((t - EARTH_START_S) / (EARTH_END_S - EARTH_START_S)));
  drawStars(t, e);
  drawMeteors(t);
  drawEarth(t, e);
  drawLunarSurface(t, smooth(0.25, 1, e));
  const [cx, cy] = logoCenter();
  drawLogo(ctx, cx, cy, logoScale(), dpr, moonProgress(t), '#f2f5fa', smooth(LOGO_FADE_IN_S[0], LOGO_FADE_IN_S[1], t));
}

function drawLight() {
  // Light mode is a still logo only: no stars, no Earth, no animation.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  const [cx, cy] = logoCenter();
  drawLogo(ctx, cx, cy, logoScale(), dpr, params.has('t') ? parseFloat(params.get('t')) : 0.5, '#0a0f1a', 1);
}

// =====================================================================
//  Loop and controls
// =====================================================================
let raf = null, startTime = performance.now();
const running = () => raf !== null;

function loop(now) {
  drawDark((now - startTime) / 1000);
  raf = requestAnimationFrame(loop);
}
function renderStatic() {
  if (isDark) drawDark(fixedAt ?? EARTH_END_S + 1); else drawLight();
}
function start() {
  if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
  if (isDark && fixedAt === null) { startTime = performance.now(); lastEarthUpdate = -1; raf = requestAnimationFrame(loop); }
  else renderStatic();
}

addEventListener('resize', () => { resize(); });
// --- pitch page additions ---
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
let pausedAt = null;
function pause() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; pausedAt = performance.now(); } }
function resume() {
  if (raf !== null || RM) return;
  if (pausedAt !== null) { startTime += performance.now() - pausedAt; pausedAt = null; }
  raf = requestAnimationFrame(loop);
}
window.MoonCareEarth = { canvas: earthCanvas, render: renderEarth };
window.setIntroTagline = function (lines) { TAGLINE = lines; if (!running()) renderStatic(); };
resize();
if (RM) renderStatic(); else start();
if ('IntersectionObserver' in window) {
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? resume() : pause())).observe(host);
}
document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
})();
