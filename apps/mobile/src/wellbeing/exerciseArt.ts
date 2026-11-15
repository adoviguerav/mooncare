// The exercise guide of Becky's prototype (apps/landing/index.html, 15 Nov), ported almost word for word:
// a figure on the Moon drawn each frame from simple joint maths, with the working muscles glowing red.
// It draws into an <svg viewBox="0 0 340 236">; the texts and controls live in ExerciseGuide.tsx.
// @ts-nocheck -- hand-drawn SVG animation kept as close to the prototype as possible
/* eslint-disable */

const R_ = Math.PI / 180
export const CYCLE_SECONDS = 4.4 // 2 s down, a short hold, 2 s up, a breath
export const REPS = 12

function exIK(S, H, l1, l2) {
  let dx = H[0] - S[0], dy = H[1] - S[1]
  const L = Math.hypot(dx, dy) || 1, d = Math.min(L, l1 + l2 - 0.01), a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / L, uy = dy / L, mx = S[0] + ux * a, my = S[1] + uy * a, e1 = [mx - uy * h, my + ux * h], e2 = [mx + uy * h, my - ux * h]
  return e1[0] < e2[0] ? e1 : e2
}

export type Exercise = {
  name: string
  short: string
  sets: string
  go: string
  back: string
  muscles: string[]
  steps: string[]
  mistake: string
  why: string
}

type Pose = (depth: number) => any

const POSES: Pose[] = [
  (d) => { const A = [150, 182], fs = 26 * R_ * d, K = [A[0] + 44 * Math.sin(fs), A[1] - 44 * Math.cos(fs)], at = 88 * R_ * d, Hp = [K[0] - 44 * Math.sin(at), K[1] - 44 * Math.cos(at)], tl = (10 + 32 * d) * R_, S = [Hp[0] + 52 * Math.sin(tl), Hp[1] - 52 * Math.cos(tl)], pl = [S[0] - 5, S[1] - 8]
    return { A, K, Hp, S, E: [S[0] - 9, S[1] + 24], Hd: pl, head: [S[0] + 20 * Math.sin(tl * 0.7), S[1] - 20 * Math.cos(tl * 0.7)], heel: [A[0] - 13, 192], ball: [A[0] + 4, 192], toe: [A[0] + 22, 192], pl, plR: 15, sh: [A[0] - 4, 40 + 8 * d], mu: [[K[0], K[1], Hp[0], Hp[1], 0.12 + 0.85 * d], [Hp[0] - 2, Hp[1], Hp[0] + 2, Hp[1], 0.1 + 0.85 * d], [K[0], K[1], K[0], K[1], 0]] } },
  (d) => { const A = [150, 182], fs = 10 * R_ * d, K = [A[0] + 44 * Math.sin(fs), A[1] - 44 * Math.cos(fs)], at = 32 * R_ * d, Hp = [K[0] - 44 * Math.sin(at), K[1] - 44 * Math.cos(at)], tl = (8 + 72 * d) * R_, S = [Hp[0] + 52 * Math.sin(tl), Hp[1] - 52 * Math.cos(tl)], Hd = [S[0], S[1] + 50], hv = tl * 0.8
    return { A, K, Hp, S, E: [S[0], S[1] + 25], Hd, head: [S[0] + 20 * Math.sin(hv), S[1] - 20 * Math.cos(hv)], heel: [A[0] - 13, 192], ball: [A[0] + 4, 192], toe: [A[0] + 22, 192], pl: Hd, plR: 15, sh: [A[0] + 6, 40 + 6 * d], mu: [[Hp[0], Hp[1], K[0], K[1], 0.12 + 0.85 * d], [Hp[0], Hp[1], Hp[0] + (S[0] - Hp[0]) * 0.6, Hp[1] + (S[1] - Hp[1]) * 0.6, 0.12 + 0.85 * d], [Hp[0], Hp[1], Hp[0], Hp[1], 0]] } },
  (d) => { const al = (19 - 14.1 * d) * R_, u = [Math.cos(al), -Math.sin(al)], T = [70, 190], at = (k) => [T[0] + u[0] * k, T[1] + u[1] * k], S = at(148), Hd = [T[0] + 148 * Math.cos(11 * R_), 190], E = exIK(S, Hd, 26, 24), hv = al + 0.3
    return { A: at(8), K: at(52), Hp: at(96), S, E, Hd, head: [S[0] + 22 * Math.cos(hv), S[1] - 22 * Math.sin(hv)], heel: at(8), ball: at(4), toe: T, pl: null, plR: 0, sh: [T[0] + 80, 50], mu: [[S[0], S[1], E[0], E[1], 0.12 + 0.85 * d], [S[0], S[1], S[0] - u[0] * 24, S[1] - u[1] * 24, 0.12 + 0.85 * d], [S[0], S[1], S[0], S[1], 0]] } },
  (d) => { const b = 34 * R_ * d, B = [152, 192], u = [-Math.cos(b), -Math.sin(b)], n = [Math.sin(b), -Math.cos(b)], A = [B[0] + 24 * u[0] + 12 * n[0], B[1] + 24 * u[1] + 12 * n[1]], K = [A[0], A[1] - 44], Hp = [A[0], K[1] - 44], tl = 3 * R_, S = [Hp[0] + 52 * Math.sin(tl), Hp[1] - 52 * Math.cos(tl)], Hd = [S[0] + 3, S[1] + 50]
    return { A, K, Hp, S, E: [S[0] + 2, S[1] + 25], Hd, head: [S[0] + 1, S[1] - 20], heel: [B[0] + 30 * u[0], B[1] + 30 * u[1]], ball: B, toe: [B[0] + 13, 192], pl: Hd, plR: 8, sh: [B[0] - 12, 40 - 4 * d], mu: [[A[0], A[1], A[0] + (K[0] - A[0]) * 0.75, A[1] + (K[1] - A[1]) * 0.75, 0.12 + 0.85 * d], [K[0], K[1], K[0], K[1], 0], [K[0], K[1], K[0], K[1], 0]] } },
]
const ARROW_DOWN_FIRST = [true, true, true, false]

export const EXERCISES: Exercise[] = [
  { name: 'Loaded squat', short: 'Squat', sets: 'Example: 3 sets of 12', go: 'Lower', back: 'Push up', muscles: ['Thighs', 'Glutes', 'Core'],
    steps: ['Stand tall with your feet shoulder-width apart. The bar or harness load sits across your upper back.', 'Breathe in. Push your hips back and bend your knees, lowering for about 2 seconds.', 'Stop when your thighs are level with the floor. Keep your chest up and your heels down.', 'Breathe out and push through your heels to stand tall, again over about 2 seconds.'],
    mistake: 'Knees dropping inward or heels lifting. If that happens, lower the load.', why: 'Your legs and hips do the most work against gravity on Earth. With only one sixth of that load on the Moon they lose strength fastest.' },
  { name: 'Hip hinge (deadlift)', short: 'Hip hinge', sets: 'Example: 3 sets of 10', go: 'Lower', back: 'Stand up', muscles: ['Back of thighs', 'Glutes', 'Lower back'],
    steps: ['Stand with your feet hip-width apart. Hold the bar in front of your thighs with straight arms.', 'Breathe in. Push your hips back, keep your back flat and slide the bar down your legs for about 2 seconds.', 'Stop when the bar reaches mid-shin or you feel a stretch behind your thighs. Do not round your back.', 'Breathe out, squeeze your glutes and drive your hips forward to stand tall.'],
    mistake: 'Rounding the lower back or pulling with the arms. Lighten the load and keep the bar close to your legs.', why: 'This strengthens the back of your legs and your lower back, which hold you upright and protect your spine.' },
  { name: 'Push-up', short: 'Push-up', sets: 'Example: 3 sets of 10', go: 'Lower chest', back: 'Push away', muscles: ['Chest', 'Shoulders', 'Arms'],
    steps: ['Place your hands under your shoulders. Keep your body in one straight line from head to heels.', 'Breathe in. Lower your chest toward the floor over about 2 seconds, elbows at roughly 45 degrees to your body.', 'Stop just above the floor. Keep your tummy tight so your hips do not sag.', 'Breathe out and push the floor away until your arms are straight.'],
    mistake: 'Hips sagging or sticking up. Drop to your knees to keep a straight line.', why: 'Chest, shoulder and arm strength keeps you steady for suit work and EVA tasks. Push-ups feel easier in low gravity, so add a weighted vest if your plan says so.' },
  { name: 'Heel raise', short: 'Heel raise', sets: 'Example: 3 sets of 15', go: 'Rise up', back: 'Lower slowly', muscles: ['Calves', 'Ankles'],
    steps: ['Stand tall with your feet hip-width apart. Hold a weight at each side if prescribed, and use a wall for balance if needed.', 'Breathe in. Rise slowly onto the balls of your feet over about 2 seconds.', 'Pause at the top and squeeze your calves.', 'Lower your heels slowly over about 2 seconds.'],
    mistake: 'Rolling the ankles outward or bouncing. Go slowly and keep your weight over the big toe.', why: 'Calf muscles weaken quickly in low gravity. They also help push blood back up from your legs.' },
]

/** Depth (0 standing to 1 at the bottom) and stage (0 going, 1 hold, 2 coming back, 3 breath) at a point of the cycle */
export function depthAt(u: number): [number, number] {
  const a = 2 / CYCLE_SECONDS, b = 2.2 / CYCLE_SECONDS, c = 4.2 / CYCLE_SECONDS, e = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x)
  return u < a ? [e(u / a), 0] : u < b ? [1, 1] : u < c ? [e(1 - (u - b) / (c - b)), 2] : [0, 3]
}

export function buildStage(svg: SVGSVGElement): void {
  const limb = (id, w) => `<line id="ex_${id}a" stroke="#1ab0de" stroke-width="${w}" opacity=".96"/><line id="ex_${id}b" stroke="#c6f7ff" stroke-width="${(w * 0.36).toFixed(1)}" opacity=".5"/>`
  const st = [[22, 30, 0.9], [60, 18, 0.6], [96, 40, 0.8], [140, 22, 0.5], [205, 34, 0.7], [250, 16, 0.9], [310, 28, 0.5], [40, 70, 0.6], [120, 58, 0.8], [190, 14, 0.7], [300, 86, 0.6], [16, 110, 0.5]].map((x, i) => `<circle cx="${x[0]}" cy="${x[1]}" r="${x[2] + 0.4}" fill="#e6f1fb" opacity=".7" style="animation-delay:${i * 0.27}s"/>`).join('')
  svg.innerHTML = `<defs><radialGradient id="exSky" cx=".5" cy=".05" r=".95"><stop offset="0" stop-color="#17467a"/><stop offset=".55" stop-color="#0a2040"/><stop offset="1" stop-color="#050d1c"/></radialGradient>
  <linearGradient id="exGnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#436284"/><stop offset="1" stop-color="#0c192d"/></linearGradient>
  <radialGradient id="exEarth" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#a6ecff"/><stop offset=".5" stop-color="#2f80d8"/><stop offset="1" stop-color="#0a2a66"/></radialGradient>
  <radialGradient id="exPlate" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="#ffe0a0"/><stop offset="1" stop-color="#e08a1a"/></radialGradient>
  <filter id="exGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="exBlur" filterUnits="userSpaceOnUse" x="-100" y="-100" width="540" height="440"><feGaussianBlur stdDeviation="4.5"/></filter></defs>
  <rect width="340" height="236" fill="url(#exSky)"/><g class="exstars">${st}</g>
  <circle cx="270" cy="84" r="20" fill="#2fd8ff" opacity=".08"/><circle cx="270" cy="84" r="13" fill="url(#exEarth)"/><circle cx="270" cy="84" r="15.5" fill="none" stroke="#7fe0ff" opacity=".28"/>
  <path d="M0 198 C60 191 110 195 170 193.5 S290 189 340 194 V236 H0Z" fill="url(#exGnd)"/><path d="M0 198 C60 191 110 195 170 193.5 S290 189 340 194" fill="none" stroke="#7fe0ff" opacity=".6" stroke-width="1.3"/>
  <ellipse cx="52" cy="214" rx="26" ry="4.5" fill="#08121f" opacity=".6"/><ellipse cx="262" cy="220" rx="34" ry="5" fill="#08121f" opacity=".55"/><ellipse cx="190" cy="228" rx="18" ry="3" fill="#08121f" opacity=".5"/>
  <ellipse id="ex_sh" cx="150" cy="195" rx="40" ry="4" fill="#000" opacity=".4"/>
  <g id="ex_wrap" transform="translate(170 192) scale(.8) translate(-170 -192)"><g filter="url(#exBlur)" stroke="#ff2f45" stroke-width="28" stroke-linecap="round"><line id="ex_mu0" opacity="0"/><line id="ex_mu1" opacity="0"/><line id="ex_mu2" opacity="0"/></g>
  <g id="ex_fig" filter="url(#exGlow)" fill="none" stroke-linecap="round" stroke-linejoin="round">${limb('ft1', 9)}${limb('ft2', 9)}${limb('sha', 12)}${limb('thi', 15)}${limb('tor', 19)}${limb('ua', 9)}${limb('fa', 8)}
   <circle id="ex_hd" r="12" fill="#1ab0de" stroke="#c6f7ff" stroke-width="1.6"/><circle id="ex_vz" r="5.5" fill="#0a2040" opacity=".55"/><circle id="ex_jk" r="4.6" fill="#e9fbff" stroke="none"/><circle id="ex_je" r="3.8" fill="#e9fbff" stroke="none"/></g>
  <g id="ex_mc" stroke="#ff4458" stroke-width="12" stroke-linecap="round" fill="none"><line id="ex_mc0" opacity="0"/><line id="ex_mc1" opacity="0"/><line id="ex_mc2" opacity="0"/></g><g id="ex_eq"><circle id="ex_pl" fill="url(#exPlate)" stroke="#fff3d6" stroke-width="1.2"/><circle id="ex_pl2" fill="#3a2406"/></g></g>
  <g id="ex_ar" opacity="0" stroke="#2fd8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M0 -22 V18 M-9 8 L0 19 L9 8"/></g>`
}

/** Draws exercise `index` at `seconds` into the cycle. Returns the depth and stage, for the texts around it. */
export function drawFrame(svg: SVGSVGElement, index: number, seconds: number): { depth: number; stage: number } {
  const $ = (id) => svg.querySelector('#' + id)
  const u = (seconds % CYCLE_SECONDS) / CYCLE_SECONDS
  const [d, sg] = depthAt(u)
  const p = POSES[index](d)
  const set = (id, a, b) => ['a', 'b'].forEach((k) => { const e = $('ex_' + id + k); e.setAttribute('x1', a[0].toFixed(1)); e.setAttribute('y1', a[1].toFixed(1)); e.setAttribute('x2', b[0].toFixed(1)); e.setAttribute('y2', b[1].toFixed(1)) })
  set('ft1', p.heel, p.ball); set('ft2', p.ball, p.toe); set('sha', p.K, p.A); set('thi', p.Hp, p.K); set('tor', p.Hp, p.S); set('ua', p.S, p.E); set('fa', p.E, p.Hd)
  const hd = $('ex_hd'); hd.setAttribute('cx', p.head[0]); hd.setAttribute('cy', p.head[1])
  const vz = $('ex_vz'); vz.setAttribute('cx', p.head[0] + 5); vz.setAttribute('cy', p.head[1] - 1)
  $('ex_jk').setAttribute('cx', p.K[0]); $('ex_jk').setAttribute('cy', p.K[1]); $('ex_je').setAttribute('cx', p.E[0]); $('ex_je').setAttribute('cy', p.E[1])
  const pl = $('ex_pl'), p2 = $('ex_pl2')
  if (p.pl) { pl.style.display = p2.style.display = ''; pl.setAttribute('cx', p.pl[0]); pl.setAttribute('cy', p.pl[1]); pl.setAttribute('r', p.plR); p2.setAttribute('cx', p.pl[0]); p2.setAttribute('cy', p.pl[1]); p2.setAttribute('r', p.plR * 0.34) } else pl.style.display = p2.style.display = 'none'
  p.mu.forEach((m, k) => { const e = $('ex_mu' + k); e.setAttribute('x1', m[0]); e.setAttribute('y1', m[1]); e.setAttribute('x2', m[2]); e.setAttribute('y2', m[3]); e.setAttribute('opacity', Math.min(0.95, m[4]).toFixed(2)); const c = $('ex_mc' + k), f = (a, b, t) => a + (b - a) * t; c.setAttribute('x1', f(m[0], m[2], 0.12).toFixed(1)); c.setAttribute('y1', f(m[1], m[3], 0.12).toFixed(1)); c.setAttribute('x2', f(m[0], m[2], 0.88).toFixed(1)); c.setAttribute('y2', f(m[1], m[3], 0.88).toFixed(1)); c.setAttribute('opacity', Math.min(0.85, m[4] * 0.9).toFixed(2)) })
  const sh = $('ex_sh'); sh.setAttribute('cx', p.sh[0]); sh.setAttribute('rx', p.sh[1])
  const ar = $('ex_ar'), moving = sg === 0 || sg === 2, down = (sg === 0) === ARROW_DOWN_FIRST[index]
  ar.setAttribute('opacity', moving ? 0.9 : 0); ar.setAttribute('transform', 'translate(306 138) scale(.9 ' + (down ? 0.9 : -0.9) + ')')
  return { depth: d, stage: sg }
}
