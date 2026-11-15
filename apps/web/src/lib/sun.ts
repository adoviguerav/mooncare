/*
  The Sun in the sky, at the left edge of the screen (used by src/components/SolarSky.tsx).

  Made the way the Earth of apps/landing/moon-care-landing.html is: a noise texture wrapped round a
  sphere, a table for each pixel of the disc that is worked out once, and a frame that only shifts the
  texture to turn the sphere. The surface has the grain of the real one (convection cells), a few
  sunspots, and gets darker towards the edge.

  What the Sun throws out is pixel fire. A small grid of heat cells lies around the Sun. Each cell takes
  its heat from the neighbour closer to the Sun, loses a random amount, and sometimes leans to one side,
  the way the old pixel-fire effects work. Where a burst is planned the cells at the edge are hot, and the
  heat runs outwards as blocky, ragged plumes, from transparent through red, orange and yellow to
  near-white (no black smoke). The big flares also fling embers: single pixels that fly out and cool.
  Everything is planned from a fixed seed, so the same thing happens at the same second on every screen.
*/

const TW = 640
const TH = 320
const S = 512 // the disc is drawn at 512 x 512 and scaled by the browser
const TURN_SECONDS = 220 // one turn of the Sun
const SURFACE_FPS = 12

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- Noise, the same value noise as the Earth ---------- */

function makeNoise(seed: number) {
  const rnd = mulberry32(seed), PERM = new Uint8Array(512), LAT = new Float32Array(256)
  const base = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [base[i], base[j]] = [base[j], base[i]] }
  for (let i = 0; i < 512; i++) PERM[i] = base[i & 255]
  for (let i = 0; i < 256; i++) LAT[i] = rnd()
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const hv = (a: number, b: number, c: number) => LAT[PERM[PERM[PERM[a] + b] + c]]
  function vn(x: number, y: number, z: number) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
    const xf = x - xi, yf = y - yi, zf = z - zi, X = xi & 255, Y = yi & 255, Z = zi & 255
    const u = fade(xf), v = fade(yf), w = fade(zf)
    const x00 = lerp(hv(X, Y, Z), hv(X + 1, Y, Z), u), x10 = lerp(hv(X, Y + 1, Z), hv(X + 1, Y + 1, Z), u)
    const x01 = lerp(hv(X, Y, Z + 1), hv(X + 1, Y, Z + 1), u), x11 = lerp(hv(X, Y + 1, Z + 1), hv(X + 1, Y + 1, Z + 1), u)
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w)
  }
  function fbm(x: number, y: number, z: number, oct: number) {
    let a = 0.5, s = 0, f = 1, n = 0
    for (let i = 0; i < oct; i++) { s += a * vn(x * f, y * f, z * f); n += a; f *= 2.03; a *= 0.5 }
    return s / n
  }
  return { vn, fbm }
}

/* ---------- What is going to happen, planned once ---------- */

type Ember = { ang: number; speed: number; delay: number; life: number }
type Burst = { t0: number; dur: number; phi: number; width: number; power: number; embers: Ember[] }

const HORIZON = 3600 // seconds planned ahead
const bursts: Burst[] = []
const wind: { phi: number; speed: number; offset: number; size: number }[] = []

{
  const rnd = mulberry32(1859)
  const limbAngle = () => (rnd() * 2 - 1) * 1.15 // only the side we can see
  let t = -2 // the first one is already going when the page opens
  while (t < HORIZON) { // small plumes, one every ten seconds or so
    bursts.push({ t0: t, dur: 4 + rnd() * 3, phi: limbAngle(), width: 0.05 + rnd() * 0.05, power: 70 + rnd() * 45, embers: [] })
    t += 9 + rnd() * 9
  }
  t = 14
  while (t < HORIZON) { // a flare now and then: a little stronger, with a few embers, never big
    bursts.push({
      t0: t, dur: 5 + rnd() * 2, phi: limbAngle(), width: 0.08 + rnd() * 0.05, power: 120 + rnd() * 45,
      embers: Array.from({ length: 5 + Math.floor(rnd() * 5) }, () => ({
        ang: (rnd() - 0.5) * 0.4, speed: 40 + rnd() * 50, delay: rnd() * 1.2, life: 1.6 + rnd() * 1.4,
      })),
    })
    t += 45 + rnd() * 35
  }
  for (let i = 0; i < 70; i++) wind.push({ phi: (rnd() * 2 - 1) * 1.35, speed: 16 + rnd() * 34, offset: rnd() * 4000, size: 0.8 + rnd() * 0.9 })
}

// From cold to white-hot. Nothing is black: what is cold is not drawn.
const FIRE: [number, number, number, number][] = [
  [170, 40, 12, 0.45],
  [214, 58, 12, 0.6],
  [244, 98, 16, 0.72],
  [255, 134, 24, 0.8],
  [255, 182, 48, 0.86],
  [255, 220, 104, 0.92],
  [255, 246, 196, 0.95],
]
const fireLevel = (heat: number) => (heat < 22 ? -1 : Math.min(FIRE.length - 1, Math.floor(((heat - 22) / 233) * FIRE.length)))

/* ---------- The Sun ---------- */

export function createSun() {
  let ready = false
  const surface = document.createElement('canvas')
  surface.width = surface.height = S
  const sctx = surface.getContext('2d')!
  const img = sctx.createImageData(S, S)
  let tex1 = new Float32Array(0), tex2 = new Float32Array(0)
  let idx = new Int32Array(0), lonBase = new Float32Array(0), row = new Int32Array(0)
  let mu = new Float32Array(0), edge = new Uint8Array(0)
  let lastSurface = -1

  // The texture and the table of every pixel of the disc. Worked out once, a little after the page opens.
  function build() {
    const { vn, fbm } = makeNoise(2024)
    tex1 = new Float32Array(TW * TH)
    tex2 = new Float32Array(TW * TH)
    for (let v = 0; v < TH; v++) {
      const lat = (0.5 - (v + 0.5) / TH) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat)
      for (let u = 0; u < TW; u++) {
        const lon = ((u + 0.5) / TW) * Math.PI * 2 - Math.PI
        const x = cl * Math.sin(lon), y = sl, z = cl * Math.cos(lon)
        // Large patches that are a little hotter or cooler, and the sunspots
        const mottle = fbm(x * 4 + 3, y * 4 + 7, z * 4 + 1, 3)
        const spotField = fbm(x * 3.1 + 40, y * 3.1 + 9, z * 3.1 + 22, 3)
        const spot = smooth(0.64, 0.74, spotField) * (1 - smooth(0.35, 0.6, Math.abs(lat)))
        const penumbra = smooth(0.58, 0.64, spotField) * (1 - smooth(0.35, 0.6, Math.abs(lat)))
        // The grain: cells of hot gas, bright in the middle and dark at the edges
        const cell1 = vn(x * 30, y * 30, z * 30) - 0.5
        const cell2 = vn(x * 62 + 5, y * 62 + 5, z * 62 + 5) - 0.5
        tex1[v * TW + u] = clamp(0.8 + 0.5 * (mottle - 0.5) + 0.55 * cell1 + 0.3 * cell2 - 0.3 * penumbra - 0.5 * spot, 0.1, 1.3)
        // A second, finer layer that turns a little faster, so the grain seems to move about
        const f1 = vn(x * 44 + 11, y * 44 + 2, z * 44 + 8) - 0.5
        const f2 = vn(x * 90 + 1, y * 90 + 4, z * 90 + 9) - 0.5
        tex2[v * TW + u] = clamp(0.8 + 0.6 * f1 + 0.35 * f2, 0.2, 1.3)
      }
    }

    const roll = 0.32, pitch = 0.2, cr = Math.cos(roll), sr = Math.sin(roll), cp = Math.cos(pitch), sp = Math.sin(pitch)
    const list: number[] = []
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - S / 2) / (S / 2), ny = (y + 0.5 - S / 2) / (S / 2)
      if (nx * nx + ny * ny < 1) list.push(y * S + x)
    }
    const n = list.length
    idx = Int32Array.from(list)
    lonBase = new Float32Array(n); row = new Int32Array(n); mu = new Float32Array(n); edge = new Uint8Array(n)
    for (let k = 0; k < n; k++) {
      const x = list[k] % S, y = (list[k] / S) | 0
      const nx = (x + 0.5 - S / 2) / (S / 2), ny = -(y + 0.5 - S / 2) / (S / 2), rr = Math.sqrt(nx * nx + ny * ny), nz = Math.sqrt(1 - rr * rr)
      const x2 = nx * cr - ny * sr, y2 = nx * sr + ny * cr
      const y3 = y2 * cp - nz * sp, z3 = y2 * sp + nz * cp
      const lat = Math.asin(clamp(y3, -1, 1)), lon = Math.atan2(x2, z3)
      lonBase[k] = ((lon + Math.PI) / (Math.PI * 2)) * TW
      row[k] = Math.min(TH - 1, Math.floor((0.5 - lat / Math.PI) * TH)) * TW
      mu[k] = nz
      edge[k] = Math.round(255 * clamp((1 - rr) * S * 0.5))
    }
    ready = true
  }

  function renderSurface(t: number) {
    const d = img.data
    const wrap = (v: number, m: number) => ((v % m) + m) % m
    const s1 = wrap((-t / TURN_SECONDS) * TW, TW), s2 = wrap((-t / (TURN_SECONDS * 0.8)) * TW + 90, TW)
    const pulse = 1 + 0.025 * Math.sin(t * 0.9)
    for (let k = 0; k < idx.length; k++) {
      let u1 = lonBase[k] + s1; if (u1 >= TW) u1 -= TW
      let u2 = lonBase[k] + s2; if (u2 >= TW) u2 -= TW
      const m = mu[k]
      // Brightness: the grain, darker towards the edge
      const T = (0.55 * tex1[row[k] + (u1 | 0)] + 0.45 * tex2[row[k] + (u2 | 0)]) * (0.3 + 0.7 * Math.pow(m, 0.55)) * pulse
      const o = idx[k] * 4
      d[o] = Math.min(255, 120 + 170 * T)
      d[o + 1] = Math.min(255, 26 + 225 * Math.pow(T, 1.45))
      d[o + 2] = Math.min(255, 4 + 180 * Math.pow(T, 3.2))
      d[o + 3] = edge[k]
    }
    sctx.putImageData(img, 0, 0)
  }

  /* --- The pixel fire --- */
  const SIM_DT = 1 / 22
  type Grid = {
    key: string; c: number; x0: number; y0: number; w: number; h: number
    heat: Float32Array; ang: Float32Array; source: Uint8Array
    inC: Int32Array; inL: Int32Array; inR: Int32Array; order: Int32Array
  }
  let grid: Grid | null = null
  let simT = -1
  const rnd = mulberry32(77)

  function buildGrid(cx: number, cy: number, R: number, H: number, c: number): Grid {
    const key = [cx, cy, R, H, c].join(',')
    if (grid !== null && grid.key === key) return grid
    const x0 = 0, y0 = Math.max(0, Math.floor((cy - R * 2.2) / c) * c)
    const x1 = cx + R * 2.2, y1 = Math.min(H, cy + R * 2.2)
    const w = Math.ceil((x1 - x0) / c), h = Math.ceil((y1 - y0) / c), n = w * h
    const ang = new Float32Array(n), source = new Uint8Array(n)
    const inC = new Int32Array(n).fill(-1), inL = new Int32Array(n).fill(-1), inR = new Int32Array(n).fill(-1)
    const rad = new Float32Array(n)
    const at = (px: number, py: number) => {
      const gx = Math.floor((px - x0) / c), gy = Math.floor((py - y0) / c)
      return gx < 0 || gy < 0 || gx >= w || gy >= h ? -1 : gy * w + gx
    }
    const active: number[] = []
    for (let gy = 0; gy < h; gy++) for (let gx = 0; gx < w; gx++) {
      const i = gy * w + gx, px = x0 + (gx + 0.5) * c, py = y0 + (gy + 0.5) * c
      const dx = px - cx, dy = py - cy, r = Math.hypot(dx, dy)
      rad[i] = r
      if (r < R * 0.985 || r > R * 2.2) continue
      ang[i] = Math.atan2(dy, dx)
      active.push(i)
      if (r < R + c * 1.2) { source[i] = 1; continue }
      const ux = dx / r, uy = dy / r // one step towards the Sun, and one to each side of it
      inC[i] = at(px - ux * c, py - uy * c)
      inL[i] = at(px - ux * c - uy * c, py - uy * c + ux * c)
      inR[i] = at(px - ux * c + uy * c, py - uy * c - ux * c)
    }
    active.sort((a, b) => rad[b] - rad[a]) // the outer cells first, so each one reads the last frame of the one inside it
    grid = { key, c, x0, y0, w, h, heat: new Float32Array(n), ang, source, inC, inL, inR, order: Int32Array.from(active) }
    simT = -1
    return grid
  }

  function step(g: Grid, t: number, R: number) {
    const { heat, order, source, inC, inL, inR, ang } = g
    const decay = 9 * (g.c / 4) * (158 / R) // plumes grow with the Sun, not with the size of the pixel
    for (let k = 0; k < order.length; k++) {
      const i = order[k]
      if (source[i]) continue
      const q = rnd()
      const n = q < 0.18 ? inL[i] : q < 0.82 ? inC[i] : inR[i] // leans to one side now and then
      const hn = n >= 0 ? heat[n] : 0
      heat[i] = hn <= 0 ? 0 : Math.max(0, hn - (0.5 + rnd()) * decay)
    }
    // the heat that the planned bursts put in at the edge
    const live = bursts.filter((b) => t >= b.t0 && t <= b.t0 + b.dur)
    for (let k = 0; k < order.length; k++) {
      const i = order[k]
      if (!source[i]) continue
      let h = 0
      for (const b of live) {
        const u = (t - b.t0) / b.dur, env = smooth(0, 0.1, u) * (1 - smooth(0.55, 1, u))
        const d = (ang[i] - b.phi) / b.width
        h += b.power * env * Math.exp(-d * d)
      }
      heat[i] = Math.min(255, h) * (0.8 + 0.2 * rnd())
    }
  }

  function drawFire(c: CanvasRenderingContext2D, cx: number, cy: number, R: number, H: number, t: number) {
    const cell = Math.max(2, Math.round(R / 55))
    const g = buildGrid(cx, cy, R, H, cell)
    if (simT < 0 || t < simT || t - simT > 12) { g.heat.fill(0); simT = Math.max(0, t - 9) } // a jump in time: warm up
    let steps = 0
    while (simT + SIM_DT <= t && steps < 260) { step(g, simT, R); simT += SIM_DT; steps++ }

    const rects: number[][] = FIRE.map(() => [])
    for (let k = 0; k < g.order.length; k++) {
      const i = g.order[k], lv = fireLevel(g.heat[i])
      if (lv < 0) continue
      rects[lv].push(g.x0 + (i % g.w) * g.c, g.y0 + Math.floor(i / g.w) * g.c)
    }
    // The embers of the flares: single pixels that fly out and cool
    for (const b of bursts) {
      if (b.embers.length === 0 || t < b.t0 || t > b.t0 + b.dur + 7) continue
      for (const e of b.embers) {
        const a = t - b.t0 - e.delay
        if (a < 0 || a > e.life) continue
        const k = a / e.life, r = R * 1.02 + e.speed * (R / 158) * (a - (a * a) / (2 * e.life))
        const an = b.phi + e.ang
        const x = Math.round((cx + r * Math.cos(an)) / cell) * cell, y = Math.round((cy + r * Math.sin(an)) / cell) * cell
        const lv = fireLevel(255 * (1 - k) * (0.75 + 0.25 * Math.sin(a * 19 + e.speed)))
        if (lv >= 0) rects[lv].push(x, y)
      }
    }
    for (let lv = 0; lv < FIRE.length; lv++) {
      if (rects[lv].length === 0) continue
      const f = FIRE[lv]
      c.fillStyle = `rgba(${f[0]},${f[1]},${f[2]},${f[3]})`
      c.beginPath()
      for (let j = 0; j < rects[lv].length; j += 2) c.rect(rects[lv][j], rects[lv][j + 1], cell, cell)
      c.fill()
    }
  }

  function draw(c: CanvasRenderingContext2D, cx: number, cy: number, R: number, reach: number, H: number, t: number) {
    c.save()
    // The corona: a bright rim and a wide soft glow, breathing a little
    const breathe = 1 + 0.03 * Math.sin(t * 0.6)
    const g = c.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 2.7 * breathe)
    g.addColorStop(0, 'rgba(255,190,90,0.55)'); g.addColorStop(0.12, 'rgba(255,150,60,0.3)')
    g.addColorStop(0.4, 'rgba(255,110,40,0.1)'); g.addColorStop(1, 'rgba(255,90,30,0)')
    c.fillStyle = g
    c.beginPath(); c.arc(cx, cy, R * 2.7 * breathe, 0, Math.PI * 2); c.fill()

    // The solar wind: specks that leave the Sun and fade as they go
    c.globalCompositeOperation = 'lighter'
    for (const w of wind) {
      const span = reach * 1.1
      const r = R * 1.05 + ((t * w.speed + w.offset) % span)
      const fade = Math.pow(1 - (r - R) / span, 1.4)
      const x = cx + r * Math.cos(w.phi), y = cy + r * Math.sin(w.phi)
      if (x > reach * 1.05 || y < -5 || y > H + 5) continue
      c.fillStyle = `rgba(255,190,120,${0.32 * fade})`
      c.fillRect(x, y, w.size, w.size)
    }
    c.globalCompositeOperation = 'source-over'

    // The disc itself
    if (ready) {
      if (t - lastSurface > 1 / SURFACE_FPS || t < lastSurface) { renderSurface(t); lastSurface = t }
      c.imageSmoothingEnabled = true
      c.imageSmoothingQuality = 'medium'
      c.drawImage(surface, cx - R, cy - R, R * 2, R * 2)
    } else {
      const d = c.createRadialGradient(cx, cy, 0, cx, cy, R)
      d.addColorStop(0, '#ffe7a8'); d.addColorStop(0.8, '#ff9a2e'); d.addColorStop(1, '#c0480e')
      c.fillStyle = d
      c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill()
    }

    // The bright rim, and the fire that leaves the edge
    const rim = c.createRadialGradient(cx, cy, R * 0.93, cx, cy, R * 1.04)
    rim.addColorStop(0, 'rgba(255,200,110,0)'); rim.addColorStop(0.55, 'rgba(255,214,140,0.28)'); rim.addColorStop(1, 'rgba(255,150,60,0)')
    c.fillStyle = rim
    c.beginPath(); c.arc(cx, cy, R * 1.04, 0, Math.PI * 2); c.fill()
    drawFire(c, cx, cy, R, H, t)
    c.restore()
  }

  return { build, draw }
}
