import { useId } from 'react'
import type { ReactElement } from 'react'

// Two beats across the width of the name
const HEARTBEAT =
  'M70 490H236L248 490L260 464L276 514L290 480L298 490H430L442 490L454 458L472 520L486 476L494 490H690'

// The Moon Care logo of the design prototype (apps/landing/index.html)
export function Logo({ height = 56 }: { height?: number }): ReactElement {
  const id = useId()
  const ink = `${id}-ink`
  const moon = `${id}-moon`
  const glow = `${id}-glow`

  return (
    <svg className="logo" viewBox="30 55 690 465" height={height} role="img" aria-label="Moon Care">
      <defs>
        <linearGradient id={ink} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6f1fb" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
        <radialGradient id={moon} cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#9fe9ff" />
        </radialGradient>
        <radialGradient id={glow} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="currentColor" stopOpacity=".45" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="logo-glow" cx="480" cy="150" r="150" fill={`url(#${glow})`} />
      <g fill="none" stroke={`url(#${ink})`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 220V90L130 175L190 90V220" />
        <ellipse cx="310" cy="150" rx="55" ry="68" />
        <circle cx="480" cy="150" r="62" stroke="currentColor" strokeWidth="3" />
        <path d="M610 220V90L690 220V90" />
        <path d="M168 338A60 68 0 1 0 168 402" />
        <path d="M250 440L295 305L340 440M265 402H325" />
        <path d="M445 440V305H490A36 36 0 0 1 490 377H445M490 377L525 440" />
        <path d="M680 305H615V440H680M615 372H670" />
      </g>
      <path d="M480 88A62 62 0 0 0 480 212A26 62 0 0 1 480 88Z" fill={`url(#${moon})`} />
      <g fill="#0d2745">
        <circle cx="437" cy="125" r="6" />
        <circle cx="447" cy="106" r="3" />
        <circle cx="438" cy="172" r="5" />
        <circle cx="448" cy="196" r="3" />
        <circle cx="433" cy="150" r="3" />
      </g>
      {/* The heartbeat under the name: a faint trace, and a bright pulse that runs along it */}
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path className="logo-trace" d={HEARTBEAT} />
        <path className="logo-pulse" d={HEARTBEAT} pathLength={1} />
      </g>
    </svg>
  )
}
