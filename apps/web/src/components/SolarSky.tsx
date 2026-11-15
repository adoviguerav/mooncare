import { useEffect, useRef } from 'react'
import { createSun } from '../lib/sun.ts'

/*
  The planets in the sky: the idea of a solar system seen from near the moon, kept quiet.

  - The Sun (src/lib/sun.ts) sits at the left edge of the screen, and each planet goes round it on a very
    large, thin, faded ellipse that crosses the screen. Inner planets are faster, as in the real thing, and
    all of them move enough to be noticed. A planet on the far side of its orbit passes behind the Sun.
  - Each planet is lit from the side of the Sun, and leaves a faint trail behind it.
  - A few dim specks go round between Mars and Jupiter (the asteroid belt), and a few small stars sparkle.
  - Reduced motion draws one still picture. Add ?sky=120 to the address to freeze the sky at second 120.
*/

type Planet = {
  a: number // semi-major axis, as a fraction of the screen width
  start: number // where on its orbit it begins, in radians
  r: number // radius in pixels on a 1440 px wide screen
  color: [number, number, number]
  bands?: boolean
  ring?: boolean
}

const PLANETS: Planet[] = [
  { a: 0.21, start: 0.16, r: 2.3, color: [172, 164, 154] }, // Mercury
  { a: 0.285, start: -1.3, r: 3.6, color: [232, 210, 162] }, // Venus
  { a: 0.37, start: 1.48, r: 4.1, color: [92, 152, 226] }, // Earth
  { a: 0.46, start: -0.7, r: 3.1, color: [206, 110, 72] }, // Mars
  { a: 0.66, start: 0.5, r: 9, color: [216, 172, 124], bands: true }, // Jupiter
  { a: 0.78, start: -0.3, r: 7, color: [228, 202, 142], bands: true, ring: true }, // Saturn
  { a: 0.88, start: 0.35, r: 4.8, color: [152, 216, 224] }, // Uranus
  { a: 0.98, start: 0.55, r: 4.8, color: [86, 130, 228] }, // Neptune
]

const SUN_R = 0.11 // radius of the Sun, as a fraction of the screen width
const SUN_X = 0 // of the width: the Sun is centred on the left edge, so half of it shows
const SUN_Y = 0.48 // of the height
const FLATTEN = 0.71 // the plane of the orbits is inclined 45 degrees to us: cos 45 = 0.71, so a circle looks like this ellipse
const TILT = -0.12 // the plane also leans a little: the right side is higher
const SPEED = 0.028 // radians per second at the orbit of Mercury (a = 0.26); the others follow
const PLANET_SCALE = 1.55 // how much larger the planets are drawn
const FPS = 24
const BELT = [0.54, 0.6]
const BELT_COUNT = 240
const SPARKLES = 30

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Same numbers every time, so the sky is the same on every screen
const rnd = mulberry32(2026)
const belt = Array.from({ length: BELT_COUNT }, () => ({
  a: BELT[0] + rnd() * (BELT[1] - BELT[0]),
  th: rnd() * Math.PI * 2,
  size: 0.8 + rnd() * 0.9,
  alpha: 0.2 + rnd() * 0.4,
}))
const sparkles = Array.from({ length: SPARKLES }, () => ({
  x: rnd(), y: rnd(), size: 0.8 + rnd() * 1.4, period: 3.5 + rnd() * 6, phase: rnd(),
  tint: rnd() < 0.6 ? '255,255,255' : rnd() < 0.5 ? '190,222,255' : '255,232,196',
}))

// Inner planets are faster, as in the real thing, but not as much as the real thing, so the outer ones also move
const omega = (a: number) => SPEED * Math.pow(a / 0.26, -1.15)
const sun = createSun()
const rgb = (c: number[], k = 1, al = 1) =>
  `rgba(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0},${al})`

function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.clearRect(0, 0, W, H)
  const sx = SUN_X * W, sy = SUN_Y * H
  const cosT = Math.cos(TILT), sinT = Math.sin(TILT)
  const scale = Math.min(Math.max(W / 1440, 0.7), 1.3)
  const at = (a: number, th: number) => {
    const lx = a * W * Math.cos(th), ly = a * W * FLATTEN * Math.sin(th)
    return { x: sx + cosT * lx - sinT * ly, y: sy + sinT * lx + cosT * ly, front: Math.sin(th) }
  }

  // The orbits: thin and faded. The far half of each (the upper one) goes behind the Sun and the near
  // half (the lower one) crosses in front of it, so they read as going round it.
  const orbits = (from: number, to: number) => {
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(190,226,255,0.1)'
    for (const p of PLANETS) {
      ctx.save()
      ctx.translate(sx, sy)
      ctx.rotate(TILT)
      ctx.beginPath()
      ctx.ellipse(0, 0, p.a * W, p.a * W * FLATTEN, 0, from, to)
      ctx.stroke()
      ctx.restore()
    }
  }
  orbits(Math.PI, Math.PI * 2)

  // The asteroid belt
  ctx.fillStyle = 'rgb(214,204,190)'
  for (const b of belt) {
    const q = at(b.a, b.th + omega(b.a) * t)
    if (q.x < -4 || q.x > W + 4 || q.y < -4 || q.y > H + 4) continue
    ctx.globalAlpha = b.alpha
    ctx.fillRect(q.x, q.y, b.size, b.size)
  }
  ctx.globalAlpha = 1

  // Small stars that sparkle: a soft core and a thin four-point glint that comes and goes
  for (const s of sparkles) {
    const f = ((t / s.period) + s.phase) % 1
    const k = f < 0.3 ? Math.sin((f / 0.3) * Math.PI) : 0 // sparkling for a third of the time, calm the rest
    const x = s.x * W, y = s.y * H, base = 0.35 + 0.15 * Math.sin(t * 0.7 + s.phase * 20)
    ctx.fillStyle = `rgba(${s.tint},${base + 0.5 * k})`
    ctx.beginPath()
    ctx.arc(x, y, s.size * 0.5 + k * 0.7, 0, Math.PI * 2)
    ctx.fill()
    if (k > 0.02) {
      const L = (5 + s.size * 5) * k
      ctx.strokeStyle = `rgba(${s.tint},${0.75 * k})`
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(x - L, y); ctx.lineTo(x + L, y)
      ctx.moveTo(x, y - L); ctx.lineTo(x, y + L)
      ctx.stroke()
    }
  }

  // The planets: those on the far side of their orbit pass behind the Sun, the others in front of it
  const drawPlanet = (p: Planet) => {
    const th = p.start + omega(p.a) * t
    const pos = at(p.a, th)
    const r = p.r * PLANET_SCALE * scale * (1 + 0.25 * pos.front) // a little larger on the near side of its orbit

    // A faint trail behind it, which shows where it has been
    ctx.lineWidth = 1
    ctx.lineCap = 'round'
    let prev = pos
    for (let i = 1; i <= 16; i++) {
      const q = at(p.a, th - i * 0.03)
      ctx.strokeStyle = rgb(p.color, 1, 0.3 * (1 - i / 16))
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke()
      prev = q
    }

    if (pos.x < -r * 3 || pos.x > W + r * 3 || pos.y < -r * 3 || pos.y > H + r * 3) return
    const dx = sx - pos.x, dy = sy - pos.y, dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl // towards the Sun

    // A little glow, so it shines
    const halo = ctx.createRadialGradient(pos.x, pos.y, r * 0.6, pos.x, pos.y, r * 3.2)
    halo.addColorStop(0, rgb(p.color, 1, 0.22)); halo.addColorStop(1, rgb(p.color, 1, 0))
    ctx.fillStyle = halo
    ctx.beginPath(); ctx.arc(pos.x, pos.y, r * 3.2, 0, Math.PI * 2); ctx.fill()

    // The back half of the ring, behind the planet
    const ringTilt = TILT - 0.35
    if (p.ring) {
      ctx.strokeStyle = rgb(p.color, 0.95, 0.5); ctx.lineWidth = Math.max(1, r * 0.22)
      ctx.beginPath(); ctx.ellipse(pos.x, pos.y, r * 1.95, r * 0.55, ringTilt, Math.PI, Math.PI * 2); ctx.stroke()
    }

    // The disc, with its stripes if it has them, and the dark side away from the Sun
    ctx.save()
    ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.clip()
    ctx.fillStyle = rgb(p.color, 1, 1)
    ctx.fillRect(pos.x - r, pos.y - r, r * 2, r * 2)
    if (p.bands) {
      for (let i = -3; i <= 3; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(120,72,42,0.28)' : 'rgba(255,236,200,0.16)'
        ctx.fillRect(pos.x - r, pos.y + i * r * 0.27 - r * 0.07, r * 2, r * 0.17)
      }
    }
    const shade = ctx.createRadialGradient(pos.x + ux * r * 0.5, pos.y + uy * r * 0.5, r * 0.15, pos.x, pos.y, r * 1.08)
    shade.addColorStop(0, 'rgba(255,255,255,0.25)'); shade.addColorStop(0.5, 'rgba(0,0,0,0.04)'); shade.addColorStop(1, 'rgba(2,5,12,0.82)')
    ctx.fillStyle = shade
    ctx.fillRect(pos.x - r, pos.y - r, r * 2, r * 2)
    ctx.restore()

    // The front half of the ring, over the planet
    if (p.ring) {
      ctx.strokeStyle = rgb(p.color, 1.05, 0.7); ctx.lineWidth = Math.max(1, r * 0.22)
      ctx.beginPath(); ctx.ellipse(pos.x, pos.y, r * 1.95, r * 0.55, ringTilt, 0, Math.PI); ctx.stroke()
    }
  }

  const farSide = (p: Planet) => Math.sin(p.start + omega(p.a) * t) < 0
  for (const p of PLANETS) if (farSide(p)) drawPlanet(p)
  sun.draw(ctx, sx, sy, Math.max(SUN_R * W, 80), W, H, t)
  orbits(0, Math.PI)
  for (const p of PLANETS) if (!farSide(p)) drawPlanet(p)
}

export function SolarSky() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (canvas === null) return
    const ctx = canvas.getContext('2d')!
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fixed = new URLSearchParams(window.location.search).get('sky') // ?sky=120 freezes the sky, for screenshots
    let W = 0, H = 0
    let raf = 0
    let last = 0
    let clock = 0 // seconds of sky so far
    let before = performance.now()

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth; H = window.innerHeight
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const seconds = () => (fixed !== null ? parseFloat(fixed) : still ? 0 : clock)
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - before) / 1000, 0.1)
      before = now
      clock += dt
      if (now - last < 1000 / FPS) return
      last = now
      draw(ctx, W, H, seconds())
    }

    size()
    draw(ctx, W, H, seconds())
    canvas.classList.add('sky-solar-ready')
    const building = window.setTimeout(() => { sun.build(); draw(ctx, W, H, seconds()) }, 120)
    if (fixed === null && !still) raf = requestAnimationFrame(frame)
    const onResize = () => { size(); draw(ctx, W, H, seconds()) }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.clearTimeout(building); window.removeEventListener('resize', onResize) }
  }, [])

  return <canvas ref={ref} className="sky-solar" aria-hidden="true" />
}
