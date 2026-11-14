// The line icons of the design prototype (apps/landing/index.html), one path set per name.
const PATHS = {
  alert: 'M12 4 2.8 19.5h18.4L12 4ZM12 10v4.2M12 17h.01',
  back: 'M15 5l-7 7 7 7',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z',
  brain:
    'M9 5a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5 3 3 0 0 0 4 3V5ZM15 5a3 3 0 0 1 3 3v1a3 3 0 0 1 1 5 3 3 0 0 1-4 3V5Z',
  chart: 'M4 18 9 12l4 3 7-9',
  database: 'M5 6c0-1.7 3.1-3 7-3s7 1.300 7 3-3.100 3-7 3-7-1.300-7-3ZM5 6v12c0 1.700 3.100 3 7 3s7-1.300 7-3V6M5 12c0 1.700 3.100 3 7 3s7-1.300 7-3',
  drop: 'M12 3.5s6 6.3 6 10.5a6 6 0 0 1-12 0c0-4.2 6-10.500 6-10.500ZM9.500 14.500a2.500 2.500 0 0 0 2.500 2.500',
  flask:
    'M9 3h6M10 3v6L5 18.500A1.800 1.800 0 0 0 6.600 21h10.800a1.800 1.800 0 0 0 1.600-2.500L14 9V3M7.500 15h9',
  heart:
    'M12 20s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.400 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10ZM7 12h2.500l1.500-2.500 2 5 1.500-2.500H17',
  home: 'M4 11.500 12 4l8 7.500M6 10v10h4.500v-6h3v6H18V10',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  moon: 'M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500Z',
  ok: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0ZM8 12.400l2.700 2.700L16 9.500',
  radiation:
    'M10.300 12a1.700 1.700 0 1 0 3.400 0 1.700 1.700 0 0 0-3.400 0ZM12 12 8.200 5.400a8.800 8.800 0 0 1 7.600 0ZM12 12l7.600 0a8.800 8.800 0 0 1-3.800 6.600ZM12 12l-3.800 6.600a8.800 8.800 0 0 1-3.800-6.600Z',
  shield: 'M12 3 4.500 6v5.500c0 4.500 3.100 8 7.500 9.500 4.400-1.500 7.500-5 7.500-9.500V6L12 3ZM8.800 12l2.200 2.200 4.200-4.400',
  smile: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0ZM8.500 14a4 4 0 0 0 7 0M9 9.500h.01M15 9.500h.01',
  temperature: 'M14 14.800V5a2 2 0 0 0-4 0v9.800a4 4 0 1 0 4 0ZM12 9v7',
  wind: 'M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3',
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
