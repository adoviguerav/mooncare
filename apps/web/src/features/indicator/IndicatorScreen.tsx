import { Icon } from '../../components/Icon.tsx'
import { useState } from 'react'
import { fetchIndicatorDetail } from '../../lib/api.ts'
import type { CrewMember, HistoryReading, Rule } from '../../lib/api.ts'
import { HISTORY_DAYS, TODAY } from '../../lib/config.ts'
import { addDays, countDaysSince, formatAge, formatTakenAt, formatValue } from '../../lib/format.ts'
import { getGroupOf } from '../../lib/groups.ts'
import { HistoryChart } from './HistoryChart.tsx'
import { useApi } from '../../hooks/useApi.ts'

type Props = { crewMember: CrewMember; indicatorId: string; onBack: () => void }

// How far back the history chart looks. The first one with enough readings is the one shown at the start.
const RANGES = [
  { label: '24 h', days: 1 },
  { label: '7 d', days: 7 },
  { label: '30 d', days: 30 },
  { label: '90 d', days: 90 },
  { label: '1 y', days: HISTORY_DAYS },
]
const MIN_READINGS_TO_START = 5
const MS_PER_DAY = 86_400_000

export function IndicatorScreen({ crewMember, indicatorId, onBack }: Props) {
  const { data: detail, error } = useApi(() =>
    fetchIndicatorDetail(crewMember.id, indicatorId, addDays(TODAY, -HISTORY_DAYS), TODAY),
  )

  const [chosenDays, setChosenDays] = useState<number | null>(null)
  const allReadings = detail?.readings ?? []
  const latest = allReadings[allReadings.length - 1]
  // Counted back from the latest reading, so "24 h" is the last 24 hours that have data
  const getReadingsOf = (days: number) => {
    if (latest === undefined) return []
    const from = Date.parse(`${latest.taken_at}Z`) - days * MS_PER_DAY
    return allReadings.filter((reading) => Date.parse(`${reading.taken_at}Z`) >= from)
  }
  const usefulRanges = RANGES.filter((range) => getReadingsOf(range.days).length >= 2)
  const startDays =
    usefulRanges.find((range) => getReadingsOf(range.days).length >= MIN_READINGS_TO_START)?.days ?? HISTORY_DAYS
  const days = chosenDays ?? startDays
  const readings = getReadingsOf(days)
  const origin = getGroupOf(indicatorId).origin
  const previous = allReadings[allReadings.length - 2]
  const brokenRule = detail?.rules.find((rule) => rule.id === latest?.broken_rule_id)

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
                  Measured {formatAge(latest.taken_at, TODAY).toLowerCase()}, {formatTakenAt(latest.taken_at)}
                </p>
                <p className="detail-reading">{describeReading(latest, previous, detail.rules, detail.indicator.unit)}</p>
                {brokenRule !== undefined && (
                  <div className="alert-action">
                    <strong>What to do</strong>
                    {brokenRule.action}
                  </div>
                )}
              </>
            )}
            <p className="detail-what">{detail.indicator.why_it_matters}</p>
          </section>

          <section className="card">
            <div className="card-heading">
              <h2>History</h2>
              <div className="ranges" role="group" aria-label="Time shown in the chart">
                {usefulRanges.map((range) => (
                  <button key={range.days} aria-pressed={range.days === days} onClick={() => setChosenDays(range.days)}>
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            {readings.length === 0 ? (
              <p className="muted">No readings in this time.</p>
            ) : (
              <HistoryChart
                name={detail.indicator.name}
                unit={detail.indicator.unit}
                readings={readings}
                rules={detail.rules}
              />
            )}
            <OutOfRangeList
              unit={detail.indicator.unit}
              readings={readings.filter((reading) => reading.broken_rule_id !== null)}
            />
          </section>

          <section className="card prose">
            <div>
              <h3>How it is measured</h3>
              <p>{detail.indicator.how_to_measure}</p>
            </div>
          </section>

          <details className="card group">
            <summary className="card-heading">
              <h2>Limits and sources</h2>
              <span className="group-chevron">
                <Icon name="back" size={18} />
              </span>
            </summary>
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
            <div className="rule">
              <h3>Where this data comes from</h3>
              <p>
                <strong>{detail.indicator.source.name}</strong>
              </p>
              <p>{detail.indicator.source.citation}</p>
              <a className="source-link" href={detail.indicator.source.url} target="_blank" rel="noreferrer">
                {detail.indicator.source.url}
              </a>
            </div>
          </details>
        </>
      )}
    </main>
  )
}

// One plain sentence about the latest reading: against its limit, and against the reading before it
function describeReading(
  latest: HistoryReading,
  previous: HistoryReading | undefined,
  rules: Rule[],
  unit: string | null,
): string {
  const brokenRule = rules.find((rule) => rule.id === latest.broken_rule_id)
  const fixedRule = rules.find((rule) => rule.baseline_direction === null)
  const sentences = []
  if (brokenRule !== undefined) sentences.push(brokenRule.explanation)
  else if (fixedRule !== undefined) sentences.push(`This is inside the normal range (${describeNormalRange(fixedRule, unit)}).`)
  else if (rules.length > 0) sentences.push('No alert: it is not far from your own usual value.')
  else sentences.push('There is no normal range for this value. Compare it with your own earlier readings.')

  if (previous !== undefined) {
    const days = countDaysSince(previous.taken_at, latest.taken_at.slice(0, 10))
    const when = days === 0 ? 'earlier the same day' : days === 1 ? 'the day before' : `${days} days before`
    sentences.push(`The reading ${when} was ${formatValue(previous.value, unit)}.`)
  }
  return sentences.join(' ')
}

function describeNormalRange(rule: Rule, unit: string | null): string {
  if (rule.low !== null && rule.high !== null) return `${formatValue(rule.low, null)} to ${formatValue(rule.high, unit)}`
  return rule.low !== null ? `${formatValue(rule.low, unit)} or more` : `${formatValue(rule.high ?? 0, unit)} or less`
}

function describeLimits(rule: Rule, unit: string | null): string {
  if (rule.baseline_direction !== null) return `well ${rule.baseline_direction} your own usual value`
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
