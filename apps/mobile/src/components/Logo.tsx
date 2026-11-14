import { useId } from 'react'

/** The Mooncare wordmark of apps/landing/logo, with ids unique per instance so several can share a page. */
export function Logo({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className={className} viewBox="30 55 690 465" role="img" aria-label="Mooncare">
      <defs>
        <linearGradient id={`${id}ink`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6f1fb" />
          <stop offset="1" stopColor="#2fd8ff" />
        </linearGradient>
        <radialGradient id={`${id}moon`} cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#9fe9ff" />
        </radialGradient>
        <radialGradient id={`${id}glow`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#2fd8ff" stopOpacity=".45" />
          <stop offset="1" stopColor="#2fd8ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="480" cy="150" r="150" fill={`url(#${id}glow)`} />
      <g fill="none" stroke={`url(#${id}ink)`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 220V90L130 175L190 90V220" />
        <ellipse cx="310" cy="150" rx="55" ry="68" />
        <circle cx="480" cy="150" r="62" stroke="#2fd8ff" strokeWidth="3" />
        <path d="M610 220V90L690 220V90" />
        <path d="M168 338A60 68 0 1 0 168 402" />
        <path d="M250 440L295 305L340 440M265 402H325" />
        <path d="M445 440V305H490A36 36 0 0 1 490 377H445M490 377L525 440" />
        <path d="M680 305H615V440H680M615 372H670" />
      </g>
      <path d="M480 88A62 62 0 0 0 480 212A26 62 0 0 1 480 88Z" fill={`url(#${id}moon)`} />
      <g fill="#0d2745">
        <circle cx="437" cy="125" r="6" />
        <circle cx="447" cy="106" r="3" />
        <circle cx="438" cy="172" r="5" />
        <circle cx="448" cy="196" r="3" />
        <circle cx="433" cy="150" r="3" />
      </g>
      <path
        d="M215 490H318L334 490L346 462L362 514L376 478L384 490H535"
        fill="none"
        stroke="#2fd8ff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
