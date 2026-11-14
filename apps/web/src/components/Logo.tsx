// The Moon Care wordmark of the design prototype, drawn in the text colour
export function Logo({ height = 56 }: { height?: number }) {
  return (
    <svg className="logo" viewBox="40 60 670 400" height={height} role="img" aria-label="Moon Care">
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 220V90L130 175L190 90V220" />
        <ellipse cx="310" cy="150" rx="55" ry="68" />
        <circle className="logo-moon-ring" cx="480" cy="150" r="62" strokeWidth="3" />
        <path d="M610 220V90L690 220V90" />
        <path d="M168 338A60 68 0 1 0 168 402" />
        <path d="M250 440L295 305L340 440M265 402H325" />
        <path d="M445 440V305H490A36 36 0 0 1 490 377H445M490 377L525 440" />
        <path d="M680 305H615V440H680M615 372H670" />
      </g>
      <path className="logo-moon" d="M480 88A62 62 0 0 0 480 212A26 62 0 0 1 480 88Z" />
    </svg>
  )
}
