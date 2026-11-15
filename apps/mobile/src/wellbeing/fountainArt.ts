// The hydration fountain of Becky's prototype (apps/landing/index.html, 15 Nov), ported almost word for word.
// It draws into an <svg viewBox="0 -34 300 244">: the water level follows today's drinks against the goal, each
// drink pours drops, and a full fountain sprays. The numbers and messages live in HydrationSheet.tsx.
// @ts-nocheck -- hand-drawn SVG animation kept as close to the prototype as possible
/* eslint-disable */

const NS = 'http://www.w3.org/2000/svg'
const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const hydY = (lv) => 172 - lv * 66
const hydHW = (y) => Math.max(66, Math.min(108, 108 - (y - 102) * 0.58))

export type Fountain = {
  /** level: 0 to 1 of the goal; pace: 0 to 1, where the level should be by now; full: the goal is reached */
  draw: (state: { level: number; pace: number; full: boolean }, instant?: boolean) => void
  pour: (ml: number) => void
  destroy: () => void
}

export function createFountain(svg: SVGSVGElement): Fountain {
  const $ = (id) => svg.querySelector('#' + id)
  const wv = '<g class="hwv"><path d="M-150 0 q18.75 -4 37.5 0' + ' t37.5 0'.repeat(15) + ' V230 H-150 Z" fill="url(#hWat)"/></g>'
  const gem = [[100, 196], [128, 197.5], [172, 197.5], [200, 196]].map((x, k) => `<circle class="hg" data-i="${k}" cx="${x[0]}" cy="${x[1]}" r="3" fill="#17314d" stroke="#6f8cab" stroke-width="1"/>`).join('')
  const sp = [[56, 34], [246, 22], [270, 92], [34, 96], [214, -8], [92, -14]].map((x, i) => `<path class="hsp" d="M${x[0]} ${x[1] - 5} L${x[0] + 1.4} ${x[1] - 1.4} L${x[0] + 5} ${x[1]} L${x[0] + 1.4} ${x[1] + 1.4} L${x[0]} ${x[1] + 5} L${x[0] - 1.4} ${x[1] + 1.4} L${x[0] - 5} ${x[1]} L${x[0] - 1.4} ${x[1] - 1.4}Z" fill="#dffbff" style="animation-delay:${i * 0.35}s;display:none"/>`).join('')
  const ARCS = [[38, 118], [70, 100], [100, 80]].flatMap((a) => [-1, 1].map((sg) => `M150 52 C${150 + sg * a[0] * 0.1} ${52 - a[1]} ${150 + sg * a[0] * 0.9} ${52 - a[1]} ${150 + sg * a[0]} 106`))
  svg.innerHTML = `<defs>
  <linearGradient id="hWat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ff3ff" stop-opacity=".9"/><stop offset=".3" stop-color="#27b9ee" stop-opacity=".88"/><stop offset="1" stop-color="#0a4c9c" stop-opacity=".92"/></linearGradient>
  <linearGradient id="hGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient>
  <radialGradient id="hGG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2fd8ff" stop-opacity=".5"/><stop offset="1" stop-color="#2fd8ff" stop-opacity="0"/></radialGradient>
  <clipPath id="hClip"><path d="M42 102 C42 152 82 174 150 174 C218 174 258 152 258 102 Z"/></clipPath></defs>
  <ellipse id="hGl" cx="150" cy="104" rx="140" ry="96" fill="url(#hGG)" opacity=".2" style="transition:opacity .6s"/>
  <ellipse cx="150" cy="191" rx="92" ry="7" fill="#2fd8ff" opacity=".08"/><ellipse cx="150" cy="191" rx="92" ry="7" fill="none" stroke="#2fd8ff" stroke-opacity=".45"/>${gem}
  <rect x="147" y="62" width="6" height="130" rx="3" fill="#9fc4e6" opacity=".4"/><ellipse cx="150" cy="187" rx="15" ry="3.2" fill="#9fc4e6" opacity=".45"/>
  <path d="M42 102 C42 152 82 174 150 174 C218 174 258 152 258 102 Z" fill="#06182f" opacity=".45"/>
  <g clip-path="url(#hClip)"><g id="hWt">${wv}<ellipse id="hSurf" cx="150" cy="1" rx="100" ry="5" fill="#e4fcff" opacity=".25"/></g>
   <line id="hPace" x1="30" x2="270" y1="140" y2="140" stroke="#2fd8ff" stroke-width="1" stroke-dasharray="3 5" opacity=".45"/></g>
  <path d="M120 62 Q150 82 180 62 Z" fill="#06182f" opacity=".5"/><ellipse id="hUp" cx="150" cy="63" rx="26" ry="3.6" fill="#8ff3ff" opacity="0" style="transition:opacity .5s"/>
  <g id="hCasc" style="display:none" fill="none" stroke="#bff4ff" stroke-width="1.8" stroke-linecap="round" opacity=".8"><path id="hC1" class="hcs" d="M121 64 Q109 74 107 120"/><path id="hC2" class="hcs" d="M179 64 Q191 74 193 120"/></g>
  <path d="M120 62 Q150 82 180 62 Z" fill="url(#hGlass)" stroke="#cfeeff" stroke-opacity=".55" stroke-width="1.2"/><ellipse cx="150" cy="62" rx="30" ry="4" fill="none" stroke="#cfeeff" stroke-opacity=".6" stroke-width="1.2"/>
  <rect x="148" y="53" width="4" height="10" rx="1.5" fill="#cfeeff" opacity=".8"/>
  <path id="hJet" class="hjet" d="M150 52 L150 -58" stroke="#cffaff" stroke-width="3.4" stroke-linecap="round" fill="none" opacity=".85" style="display:none"/>
  <g id="hStat" fill="none" stroke-linecap="round" style="display:none"><g stroke="#8ff3ff" stroke-width="4.5" opacity=".14">${ARCS.map((d) => `<path d="${d}"/>`).join('')}</g><g stroke="#dff8ff" stroke-width="1.5" opacity=".6">${ARCS.map((d) => `<path d="${d}"/>`).join('')}</g><g stroke="#ffffff" stroke-width="2.4" opacity=".9">${ARCS.map((d, k) => `<path class="har" style="animation-delay:${k * -0.17}s" d="${d}"/>`).join('')}</g></g>
  ${sp}
  <path d="M42 102 C42 152 82 174 150 174 C218 174 258 152 258 102 Z" fill="url(#hGlass)" stroke="#cfeeff" stroke-opacity=".5" stroke-width="1.3"/>
  <path d="M56 114 C58 138 70 154 94 164" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/>
  <ellipse cx="150" cy="102" rx="108" ry="10" fill="none" stroke="#cfeeff" stroke-opacity=".5" stroke-width="1.3"/>
  <g id="hyR"></g><g id="hyP" fill="#cffaff"></g>`

  const H = { lv: 0, target: 0, raf: 0, p: [], last: 0, acc: 0, full: false, rip: 0, rt: 0, alive: true }

  function water() {
    const y = hydY(H.lv)
    $('hWt').setAttribute('transform', 'translate(0 ' + y.toFixed(1) + ')')
    $('hSurf').setAttribute('rx', hydHW(y).toFixed(1))
    $('hUp').setAttribute('opacity', H.lv > 0 ? 0.85 : 0)
    const on = H.lv >= 0.5 && !H.full
    $('hCasc').style.display = on ? '' : 'none'
    if (on) {
      const wy = (y + 1).toFixed(1)
      $('hC1').setAttribute('d', 'M121 64 Q109 74 107 ' + wy)
      $('hC2').setAttribute('d', 'M179 64 Q191 74 193 ' + wy)
    }
  }
  function spawn(x, y, vx, vy, r, fill) {
    if (H.p.length > 260) return
    const c = document.createElementNS(NS, 'circle')
    if (fill) c.setAttribute('fill', fill)
    c.setAttribute('r', r || 2.2)
    c.setAttribute('cx', x)
    c.setAttribute('cy', y)
    $('hyP').appendChild(c)
    H.p.push({ c, x, y, vx, vy })
  }
  function ripple(x, y, f) {
    if (!f && ++H.rip % 3) return
    const e = document.createElementNS(NS, 'ellipse')
    e.setAttribute('class', 'hrip')
    e.setAttribute('cx', x)
    e.setAttribute('cy', y)
    e.setAttribute('rx', 6)
    e.setAttribute('ry', 1.8)
    $('hyR').appendChild(e)
    setTimeout(() => e.remove(), 950)
  }
  function burst() {
    if (RM) return
    for (let i = 0; i < 26; i++) {
      const a = (Math.random() - 0.5) * 1.1
      spawn(150, 52, Math.sin(a) * (30 + Math.random() * 100), -(160 + Math.random() * 150), 2 + Math.random() * 1.2)
    }
    for (let i = 0; i < 8; i++) {
      const a = (Math.random() - 0.5) * 1.6
      spawn(150, 52, Math.sin(a) * (60 + Math.random() * 130), -(200 + Math.random() * 150), 2.6, i % 2 ? '#ffb84a' : '#fff6d8')
    }
    kick()
  }
  function kick() {
    if (!H.raf && H.alive) {
      H.last = 0
      H.raf = requestAnimationFrame(tick)
    }
  }
  function tick(ts) {
    H.raf = 0
    if (!H.alive) return
    const dt = H.last ? Math.min(0.05, (ts - H.last) / 1000) : 0.016
    H.last = ts
    if (RM) H.lv = H.target
    else H.lv += (H.target - H.lv) * Math.min(1, dt * 3.2)
    if (Math.abs(H.target - H.lv) < 0.002) H.lv = H.target
    water()
    if (H.full && !RM) {
      H.acc += dt * 20
      while (H.acc >= 1) {
        H.acc--
        const a = (Math.random() - 0.5) * 0.5
        spawn(150, -52, Math.sin(a) * 40, 20 + Math.random() * 30, 1.6)
      }
      H.rt += dt
      if (H.rt > 0.12) {
        H.rt = 0
        const d = [38, 70, 100][Math.floor(Math.random() * 3)] * (Math.random() < 0.5 ? -1 : 1)
        ripple(150 + d, hydY(H.lv) + 2, 1)
      }
    }
    const wy = hydY(H.lv) + 2
    for (let i = H.p.length - 1; i >= 0; i--) {
      const q = H.p[i]
      q.vy += 300 * dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      if (q.vy > 0 && q.y >= wy && q.x > 46 && q.x < 254) {
        ripple(q.x, wy)
        q.c.remove()
        H.p.splice(i, 1)
      } else if (q.y > 240) {
        q.c.remove()
        H.p.splice(i, 1)
      } else {
        q.c.setAttribute('cx', q.x.toFixed(1))
        q.c.setAttribute('cy', q.y.toFixed(1))
      }
    }
    if (H.full || H.p.length || H.lv !== H.target) H.raf = requestAnimationFrame(tick)
  }

  return {
    draw({ level, pace, full }, instant) {
      if (instant) H.lv = level
      H.target = level
      const wasFull = H.full
      H.full = full
      svg.classList.toggle('full', full)
      const py = hydY(Math.min(1, pace))
      $('hPace').setAttribute('y1', py)
      $('hPace').setAttribute('y2', py)
      $('hPace').style.display = full ? 'none' : ''
      svg.querySelectorAll('.hg').forEach((e) => {
        const on = level >= (+e.dataset.i + 1) / 4 - 0.001
        e.setAttribute('fill', on ? '#2fd8ff' : '#17314d')
        e.setAttribute('stroke', on ? '#dffbff' : '#6f8cab')
        e.style.filter = on ? 'drop-shadow(0 0 4px #2fd8ff)' : ''
      })
      $('hGl').setAttribute('opacity', (0.18 + level * 0.3).toFixed(2))
      $('hJet').style.display = full && !RM ? '' : 'none'
      $('hStat').style.display = full ? '' : 'none'
      svg.querySelectorAll('.hsp').forEach((e) => (e.style.display = full && !RM ? '' : 'none'))
      water()
      if (full && !wasFull && !instant) burst()
      kick()
    },
    pour(ml) {
      if (RM) return
      const n = Math.min(26, Math.max(5, Math.round(ml / 20)))
      for (let i = 0; i < n; i++) spawn(150 + (Math.random() - 0.5) * 56, -30 - Math.random() * 14, (Math.random() - 0.5) * 14, 40 + Math.random() * 50, 2)
      kick()
    },
    destroy() {
      H.alive = false
      if (H.raf) cancelAnimationFrame(H.raf)
    },
  }
}
