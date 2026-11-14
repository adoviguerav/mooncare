import { Icon } from '../../components/Icon.tsx'
import { fetchIndicatorDetail } from '../../lib/api.ts'
import { TODAY } from '../../lib/config.ts'
import { addDays } from '../../lib/format.ts'
import { useApi } from '../../hooks/useApi.ts'
import type { Emergency } from '../../lib/emergency.ts'
import { INFECTION_SIGNALS } from '../../lib/infectionSignals.ts'

// How far back the usual value looks. A year, because blood is drawn only a few times.
const USUAL_VALUE_DAYS = 365

type Signal = { label: string; unit: string | null; usual: number; simulated: number }

async function fetchSignals(patientId: number): Promise<Signal[]> {
  const details = await Promise.all(
    INFECTION_SIGNALS.map((signal) =>
      fetchIndicatorDetail(patientId, signal.id, addDays(TODAY, -USUAL_VALUE_DAYS), TODAY),
    ),
  )
  return details.flatMap((detail, index) => {
    const values = detail.readings.map((reading) => reading.value).toSorted((a, b) => a - b)
    if (values.length === 0) return []
    const usual = values[Math.floor(values.length / 2)]
    const { label, simulatedChange } = INFECTION_SIGNALS[index]
    return [{ label, unit: detail.indicator.unit, usual, simulated: usual + simulatedChange }]
  })
}

function formatReading(value: number, unit: string | null): string {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10
  return unit === null ? String(rounded) : `${rounded} ${unit}`
}

// What the model saw: each reading of the alert next to the crew member's own usual value
export function InfectionSignals({ emergency }: { emergency: Emergency }) {
  const { data: signals } = useApi(() => fetchSignals(emergency.patientId))
  if (signals === null || signals.length === 0) return null

  return (
    <section className="card">
      <div className="card-heading">
        <span className="icon-badge icon-badge-alert">
          <Icon name="alert" />
        </span>
        <div>
          <h2>What the infection model saw</h2>
          <p className="origin">
            {signals.length} readings away from {emergency.patientName}'s usual values at the same time. Simulated
            detection.
          </p>
        </div>
      </div>
      <ul className="signals">
        {signals.map((signal) => (
          <li key={signal.label} className="signal">
            <span className="signal-label">{signal.label}</span>
            <span className="signal-usual">Usual {formatReading(signal.usual, signal.unit)}</span>
            <span className="signal-now">
              <span aria-hidden="true">{signal.simulated > signal.usual ? '▲' : '▼'}</span>{' '}
              {formatReading(signal.simulated, signal.unit)}
            </span>
          </li>
        ))}
      </ul>
      <p className="detection-legend">
        <span className="legend-real">Usual value: the median of the real readings of the last year.</span>
        <span className="legend-simulated">Reading of the alert: simulated.</span>
      </p>
    </section>
  )
}
