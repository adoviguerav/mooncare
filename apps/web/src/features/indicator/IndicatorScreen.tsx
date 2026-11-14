import { Icon } from '../../components/Icon.tsx'
import { fetchIndicatorDetail } from '../../lib/api.ts'
import type { CrewMember, Rule } from '../../lib/api.ts'
import { HISTORY_DAYS, TODAY } from '../../lib/config.ts'
import { addDays, formatAge, formatTakenAt, formatValue } from '../../lib/format.ts'
import { getGroupOf } from '../../lib/groups.ts'
import { HistoryChart } from './HistoryChart.tsx'
import { useApi } from '../../hooks/useApi.ts'

type Props = { crewMember: CrewMember; indicatorId: string; onBack: () => void }

export function IndicatorScreen({ crewMember, indicatorId, onBack }: Props) {
  const { data: detail, error } = useApi(() =>
    fetchIndicatorDetail(crewMember.id, indicatorId, addDays(TODAY, -HISTORY_DAYS), TODAY),
  )

  const latest = detail?.readings[detail.readings.length - 1]
  const origin = getGroupOf(indicatorId).origin

  return (
    <main className="screen">
      <header className="detail-header">
        <button className="back" onClick={onBack} aria-label="Back to the panel">
          <Icon name="back" />
        </button>
        <div>
          <h1>{detail?.indicator.name ?? 'Loading'}</h1>
          {origin !== '' && <p className="muted">{origin}</p>}
        </div>
      </header>
      {error !== null && <p role="alert">Could not load this indicator. {error}</p>}
      {detail === null && error === null && <div className="card skeleton skeleton-tall" aria-busy="true" />}
      {detail !== null && (
        <>
          <section className="card">
            {latest === undefined ? (
              <p className="muted">No readings yet.</p>
            ) : (
              <>
                <p className={latest.broken_rule_id === null ? 'detail-value' : 'detail-value is-alert'}>
                  {formatValue(latest.value, detail.indicator.unit)}
                </p>
                <p className="muted">
                  {formatAge(latest.taken_at, TODAY)}, {formatTakenAt(latest.taken_at)}
                </p>
              </>
            )}
          </section>

          <section className="card">
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

          <section className="card prose">
            <div>
              <h3>Why it matters</h3>
              <p>{detail.indicator.why_it_matters}</p>
            </div>
            <div>
              <h3>How it is measured</h3>
              <p>{detail.indicator.how_to_measure}</p>
            </div>
          </section>

          <section className="card">
            <div className="card-heading">
              <h2>When it alerts</h2>
            </div>
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

          <section className="card prose">
            <div>
              <h3>Where this data comes from</h3>
              <p>
                <strong>{detail.indicator.source.name}</strong>
              </p>
              <p>{detail.indicator.source.citation}</p>
              <a className="source-link" href={detail.indicator.source.url} target="_blank" rel="noreferrer">
                {detail.indicator.source.url}
              </a>
            </div>
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
