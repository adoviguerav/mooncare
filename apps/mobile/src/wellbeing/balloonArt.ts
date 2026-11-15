// The breathing balloon of Becky's prototype (apps/landing/index.html, 15 Nov), ported almost word for word.
// Breathe in: it grows. Breathe out: it shrinks. When the breaths are done it floats off the top of the screen.
// It draws into an <svg viewBox="0 0 300 312">; the texts and buttons live in BreathingSheet.tsx.
// @ts-nocheck -- hand-drawn SVG animation kept as close to the prototype as possible
/* eslint-disable */

const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const IN_SECONDS = 4
const OUT_SECONDS = 6
const LIFT_SECONDS = 4.6

export type BalloonMode = 'idle' | 'run' | 'lift' | 'done'
export type BalloonState = { mode: BalloonMode; phase: 'in' | 'out'; breath: number; count: number; progress: number }

export type Balloon = {
  start: (breaths: number) => void
  stop: () => void
  destroy: () => void
}

export function createBalloon(svg: SVGSVGElement, onChange: (state: BalloonState) => void): Balloon {
  const $ = (id) => svg.querySelector('#' + id)
  const W = 56,
    N = 48
  const wf = (t) => (t < 0.45 ? 9 + (W - 9) * Math.pow(Math.sin((t / 0.45) * Math.PI / 2), 0.9) : W * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.45) / 0.55, 2))))
  const pts = (k, n) => Array.from({ length: (n || N) + 1 }, (_, i) => { const t = i / N; return [k * wf(t), -132 * t] })
  const line = (a) => a.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('')
  const ENV_ = line(pts(-1)) + line(pts(1).reverse()).replace('M', 'L') + 'Z'
  const KS = [-1, -0.72, -0.4, 0.4, 0.72, 1]
  const BC = [['#2fd8ff', 0.5], ['#1578cc', 0.55], ['#dff8ff', 0.3], ['#1578cc', 0.55], ['#2fd8ff', 0.5]]
  const bands = KS.slice(0, -1).map((k, i) => `<path d="${line(pts(k))}${line(pts(KS[i + 1]).reverse()).replace('M', 'L')}Z" fill="${BC[i][0]}" fill-opacity="${BC[i][1]}"/>`).join('')
  const seams = KS.slice(1, -1).map((k) => `<path d="${line(pts(k))}" fill="none" stroke="#dff8ff" stroke-opacity=".45" stroke-width=".9"/>`).join('')
  svg.innerHTML = `<defs>
  <linearGradient id="bBasN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d4068"/><stop offset="1" stop-color="#0a1c36"/></linearGradient>
  <radialGradient id="bFl" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffb84a"/><stop offset="1" stop-color="#ff7a30" stop-opacity="0"/></radialGradient>
  <radialGradient id="bGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2fd8ff" stop-opacity=".35"/><stop offset="1" stop-color="#2fd8ff" stop-opacity="0"/></radialGradient>
  <linearGradient id="bShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#021a3a" stop-opacity=".3"/><stop offset=".32" stop-color="#021a3a" stop-opacity="0"/><stop offset=".62" stop-color="#021a3a" stop-opacity=".02"/><stop offset="1" stop-color="#021a3a" stop-opacity=".35"/></linearGradient>
  <clipPath id="bClip"><path d="${ENV_}"/></clipPath>
  <filter id="bBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5"/></filter></defs>
  <g id="brCl"></g>
  <ellipse cx="150" cy="298" rx="62" ry="9" fill="#2fd8ff" opacity=".12"/><ellipse cx="150" cy="298" rx="62" ry="9" fill="none" stroke="#2fd8ff" stroke-opacity=".55" stroke-width="1.2"/><ellipse cx="150" cy="298" rx="38" ry="5" fill="none" stroke="#cfeeff" stroke-opacity=".35"/>
  <g id="brB"><g class="brbob">
    <ellipse id="brAura" cx="150" cy="170" rx="100" ry="110" fill="url(#bGlow)" opacity=".7"/>
    <g id="brEnv" transform="translate(150 238)">
      <g clip-path="url(#bClip)">${bands}<rect x="-70" y="-13" width="140" height="13" fill="#06182f" fill-opacity=".7"/><rect x="-70" y="-14" width="140" height="1.6" fill="#2fd8ff"/>${seams}
        <path d="${ENV_}" fill="url(#bShade)"/><ellipse cx="-26" cy="-84" rx="7" ry="32" fill="#fff" opacity=".28" transform="rotate(9 -26 -84)"/></g>
      <path d="${ENV_}" fill="none" stroke="#cfeeff" stroke-opacity=".75" stroke-width="1.2"/>
      <path d="M-9 -1 Q0 5 9 -1 L7 6 H-7Z" fill="#7794b3"/>
    </g>
    <g id="brFl" class="brfl"><ellipse cx="150" cy="248" rx="9" ry="13" fill="url(#bFl)" filter="url(#bBlur)"/><ellipse cx="150" cy="249" rx="3.2" ry="6" fill="#fff3b8"/></g>
    <path d="M143 243 L137 262M157 243 L163 262M150 244 L150 262" stroke="#b8d4ea" stroke-opacity=".8" stroke-width="1"/>
    <rect x="134" y="262" width="32" height="20" rx="5" fill="url(#bBasN)"/><rect x="134" y="262" width="32" height="3.2" rx="1.6" fill="#2fd8ff" opacity=".8"/><rect x="134" y="262" width="32" height="20" rx="5" fill="none" stroke="#9fd8ff" stroke-opacity=".5"/>
  </g></g>`

  const B = { mode: 'idle', ph: 'in', round: 0, total: 5, t0: 0, s: 1, lift: 0, raf: 0, count: 0, progress: 0, alive: true }

  function report() {
    onChange({ mode: B.mode, phase: B.ph, breath: B.round + 1, count: B.count, progress: B.progress })
  }
  function apply() {
    const s = B.s
    $('brEnv').setAttribute('transform', 'translate(150 238) scale(' + s.toFixed(3) + ')')
    const lift = B.lift
    const sx = B.mode === 'lift' ? 8 * Math.sin(lift / 38) * Math.min(1, lift / 120) : 0
    $('brB').setAttribute('transform', 'translate(' + sx.toFixed(1) + ' ' + (-lift).toFixed(1) + ')')
    $('brFl').style.opacity = Math.min(1, 0.55 + ((s - 1) / 0.38) * 0.45 + (B.mode === 'lift' ? 0.2 : 0)).toFixed(2)
    $('brAura').setAttribute('opacity', (0.35 + ((s - 1) / 0.38) * 0.55).toFixed(2))
  }
  function reset() {
    B.mode = 'idle'
    B.s = 1
    B.lift = 0
    B.round = 0
    B.progress = 0
    B.count = 0
    $('brB').style.opacity = 1
    apply()
  }
  function tick(ts) {
    B.raf = 0
    if (!B.alive || B.mode === 'idle' || B.mode === 'done') return
    if (!B.t0) B.t0 = ts
    const el = (ts - B.t0) / 1000
    if (B.mode === 'run') {
      const d = B.ph === 'in' ? IN_SECONDS : OUT_SECONDS
      const u = Math.min(1, el / d)
      const e = 0.5 - 0.5 * Math.cos(Math.PI * u)
      B.s = RM ? (B.ph === 'in' ? 1.38 : 1) : B.ph === 'in' ? 1 + 0.38 * e : 1.38 - 0.38 * e
      B.count = Math.max(1, Math.ceil(d - el))
      B.progress = (B.round + (B.ph === 'in' ? 0.4 * u : 0.4 + 0.6 * u)) / B.total
      if (u >= 1) {
        B.t0 = ts
        if (B.ph === 'in') B.ph = 'out'
        else {
          B.round++
          if (B.round >= B.total) {
            B.mode = 'lift'
            B.s = 1
            B.progress = 1
            B.round = B.total - 1
          } else B.ph = 'in'
        }
      }
    } else if (B.mode === 'lift') {
      const u = Math.min(1, el / (RM ? 1 : LIFT_SECONDS))
      B.lift = RM ? 0 : 520 * u * u
      $('brB').style.opacity = RM ? 1 - u : 1
      if (u >= 1) {
        B.mode = 'done'
        $('brB').style.opacity = 0
      }
    }
    apply()
    report()
    if (B.mode === 'run' || B.mode === 'lift') B.raf = requestAnimationFrame(tick)
  }

  apply()
  return {
    start(breaths) {
      reset()
      B.total = breaths
      B.mode = 'run'
      B.ph = 'in'
      B.t0 = 0
      report()
      if (!B.raf) B.raf = requestAnimationFrame(tick)
    },
    stop() {
      if (B.raf) cancelAnimationFrame(B.raf)
      B.raf = 0
      reset()
      report()
    },
    destroy() {
      B.alive = false
      if (B.raf) cancelAnimationFrame(B.raf)
    },
  }
}
