import type { Me, PanelIndicator } from '@mooncare/api'

const RING_RADIUS = 50
const SEGMENT_GAP = 2.8 // of 100, between two segments
const STAGGER_MS = 70
// The ring shows a few vitals to read at a glance, like Becky's prototype, plus every reading with an alert
const RING_IDS = [
  'resting_heart_rate',
  'heart_rate_variability',
  'spo2',
  'breathing_rate',
  'skin_temperature',
  'sleep_duration',
  'very_active_minutes',
  'radiation_dose_rate',
]

/** The vitals of the ring: the alerts first, then the everyday ones that have a reading. */
export function ringOf(withReading: PanelIndicator[]): PanelIndicator[] {
  const alerts = withReading.filter((indicator) => indicator.broken_rule)
  const everyday = RING_IDS.flatMap((id) => withReading.filter((indicator) => indicator.id === id && !indicator.broken_rule))
  return [...alerts, ...everyday]
}

/** Good morning, afternoon or evening, on this device's clock (Becky's prototype). */
export function greeting(me: Me, at = new Date()): string {
  const hour = at.getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${me.role === 'commander' ? `Commander ${me.display_name}` : me.display_name}`
}

/** The line under the greeting: how many vitals are in range, and which to check. */
export function readinessLine(vitals: PanelIndicator[]): { tone: 'w' | 'k'; strong: string; rest: string } {
  const bad = vitals.filter((indicator) => indicator.broken_rule)
  if (bad.length === 0) return { tone: 'k', strong: `All ${vitals.length} vitals nominal.`, rest: '' }
  const names = bad.map((indicator) => indicator.name.toLowerCase())
  const list = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.length} readings`
  return { tone: 'w', strong: `${vitals.length - bad.length} of ${vitals.length} vitals nominal.`, rest: ` Check ${list}.` }
}

/**
 * Becky's vitals ring: one segment per vital with a reading, green when nominal and amber (pulsing) when it needs
 * review. A tap opens that reading. The heart rate beats in the middle at its own pace.
 */
export function VitalsRing({
  vitals,
  heartRate,
  onOpen,
}: {
  vitals: PanelIndicator[]
  heartRate: number | null
  onOpen: (indicatorId: string) => void
}) {
  const total = vitals.length
  const segment = total ? 100 / total - SEGMENT_GAP : 0
  const nominal = vitals.filter((indicator) => !indicator.broken_rule).length
  return (
    <div className="vring" role="group" aria-label={`Vitals: ${nominal} of ${total} nominal`}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="var(--line)" strokeWidth="9" opacity=".5" />
        {vitals.map((indicator, position) => {
          const alert = Boolean(indicator.broken_rule)
          return (
            <circle
              key={indicator.id}
              className={`va${alert ? ' al' : ''}`}
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              pathLength={100}
              tabIndex={0}
              role="button"
              aria-label={`${indicator.name}: ${alert ? 'needs review' : 'nominal'}. Show this reading`}
              stroke={alert ? 'var(--warn)' : 'var(--ok)'}
              transform="rotate(-90 60 60)"
              style={{
                strokeDasharray: `${segment} ${100 - segment}`,
                strokeDashoffset: -((position * 100) / total),
                transitionDelay: `${position * STAGGER_MS}ms`,
              }}
              onClick={() => onOpen(indicator.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpen(indicator.id)
                }
              }}
            >
              <title>{`${indicator.name}${alert ? ', needs review' : ', nominal'}`}</title>
            </circle>
          )
        })}
      </svg>
      <div className={`vc${heartRate ? ' beat' : ''}`}>
        <b style={heartRate ? { animationDuration: `${60 / heartRate}s` } : undefined}>{heartRate ? Math.round(heartRate) : '—'}</b>
        <small>bpm</small>
      </div>
    </div>
  )
}

export function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c.5 3-1.5 4.5-3 6.5S7 13 8.5 15.5c.7 1.2 2 2 3.5 2 2.8 0 5-2.2 5-5 0-2-1-3.5-2-4.5.1 1.4-.4 2.4-1.2 3C14.8 8 14 5 12 3Z" />
    </svg>
  )
}

export function TaskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--cy)' }}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.4 2.7 2.7L16 9.5" />
    </svg>
  )
}
