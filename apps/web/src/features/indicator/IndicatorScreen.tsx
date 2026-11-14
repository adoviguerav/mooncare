import { fetchIndicatorDetail } from '../../lib/api.ts'
import type { CrewMember, Rule } from '../../lib/api.ts'
import { HISTORY_DAYS, TODAY } from '../../lib/config.ts'
import { addDays, formatTakenAt, formatValue } from '../../lib/format.ts'
import { HistoryChart } from './HistoryChart.tsx'
import { useApi } from '../../hooks/useApi.ts'

type Props = { crewMember: CrewMember; indicatorId: string; onBack: () => void }

export function IndicatorScreen({ crewMember, indicatorId, onBack }: Props) {
  const { data: detail, error } = useApi(() =>
    fetchIndicatorDetail(crewMember.id, indicatorId, addDays(TODAY, -HISTORY_DAYS), TODAY),
  )

  return (
    <main className="screen">
      <button className="link-button" onClick={onBack}>
        ← Back to the panel
      </button>
      {error !== null && <p role="alert">Could not load this indicator. {error}</p>}
      {detail !== null && (
        <>
          <h1>{detail.indicator.name}</h1>

          <section>
            <h2>Why it matters</h2>
            <p>{detail.indicator.why_it_matters}</p>
            <h2>How to measure it</h2>
            <p>{detail.indicator.how_to_measure}</p>
          </section>

          <section>
            <h2>History</h2>
            {detail.readings.length === 0 ? (
              <p className="muted">No readings yet.</p>
            ) : (
              <HistoryChart
                name={detail.indicator.name}
                unit={detail.indicator.unit}
                readings={detail.readings}
                rules={detail.rules}
              />
            )}
            <OutOfRangeList
              unit={detail.indicator.unit}
              readings={detail.readings.filter((reading) => reading.broken_rule_id !== null)}
            />
          </section>

          <section>
            <h2>Rules</h2>
            {detail.rules.length === 0 && <p className="muted">This indicator has no alert rule yet.</p>}
            {detail.rules.map((rule) => (
              <div key={rule.id} className="rule">
                <strong>{rule.title}</strong>
                <p>Alert when the value is {describeLimits(rule, detail.indicator.unit)}.</p>
                <p>{rule.explanation}</p>
                <p>
                  <strong>What to do:</strong> {rule.action}
                </p>
                <p className="muted">Where the limit comes from: {rule.threshold_source}</p>
              </div>
            ))}
          </section>

          <section>
            <h2>Data source</h2>
            <p>
              <strong>{detail.indicator.source.name}</strong>
            </p>
            <p>{detail.indicator.source.citation}</p>
            <p className="muted">{detail.indicator.source.url}</p>
          </section>
        </>
      )}
    </main>
  )
}

function describeLimits(rule: Rule, unit: string | null): string {
  const limits = []
  if (rule.low !== null) limits.push(`below ${formatValue(rule.low, unit)}`)
  if (rule.high !== null) limits.push(`above ${formatValue(rule.high, unit)}`)
  return limits.join(' or ')
}

type OutOfRangeListProps = { unit: string | null; readings: { taken_at: string; value: number }[] }

function OutOfRangeList({ unit, readings }: OutOfRangeListProps) {
  if (readings.length === 0) return null

  return (
    <>
      <h3>Out of range</h3>
      <ul className="out-of-range">
        {readings.map((reading) => (
          <li key={reading.taken_at}>
            <span>{formatTakenAt(reading.taken_at)}</span>
            <strong>{formatValue(reading.value, unit)}</strong>
          </li>
        ))}
      </ul>
    </>
  )
}
