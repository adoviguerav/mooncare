import { Icon } from '../../components/Icon.tsx'
import { useEffect, useState } from 'react'
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
  const previous = allReadings[allReadings.length - 2]
  const brokenRule = detail?.rules.find((rule) => rule.id === latest?.broken_rule_id)

  const fixedRule = detail?.rules.find((rule) => rule.baseline_direction === null)
  const status = getStatus(latest, detail?.rules ?? [])

  return (
    <main className="screen detail">
      <header className="detail-header">
        <button className="back" onClick={onBack} aria-label="Back to the panel">
          <Icon name="back" />
        </button>
        <div>
          <p className="eyebrow">{getGroupOf(indicatorId).title}</p>
          <h1>{detail?.indicator.name ?? 'Loading'}</h1>
        </div>
      </header>
      {error !== null && <p role="alert">Could not load this indicator. {error}</p>}
      {detail === null && error === null && <div className="card skeleton skeleton-tall" aria-busy="true" />}
      {detail !== null && (
        <>
          <section className="card reading-card">
            <p className="eyebrow">Your latest reading</p>
            {latest === undefined ? (
              <p className="muted">No readings yet.</p>
            ) : (
              <>
                <div className="reading-top">
                  <p className={latest.broken_rule_id === null ? 'detail-value' : 'detail-value is-alert'}>
                    <CountUp value={latest.value} unit={detail.indicator.unit} />
                  </p>
                  <span className={`chip chip-${status.tone}`}>{status.label}</span>
                </div>
                <p className="muted">
                  Measured {formatAge(latest.taken_at, TODAY).toLowerCase()}, {formatTakenAt(latest.taken_at)}
                </p>
                {fixedRule !== undefined && (
                  <RangeBar rule={fixedRule} value={latest.value} unit={detail.indicator.unit} />
                )}
              </>
            )}
          </section>

          <section className="card explain">
            <div>
              <h2>What it is</h2>
              <p>{detail.indicator.why_it_matters}</p>
            </div>
            <div>
              <h2>What is normal</h2>
              <p>{describeNormal(detail.rules, detail.indicator.unit)}</p>
            </div>
            {latest !== undefined && (
              <div>
                <h2>What your reading means</h2>
                <p>{describeReading(latest, previous, detail.rules, detail.indicator.unit)}</p>
              </div>
            )}
            <div className={brokenRule === undefined ? undefined : 'explain-action'}>
              <h2>What to do</h2>
              <p>{describeAction(brokenRule, detail.rules)}</p>
            </div>
          </section>

          <section className="card">
            <div className="card-heading">
              <h2>How it has changed</h2>
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
                // A new chart for each range, so the line draws itself again
                key={days}
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

          <section className="card explain">
            <div>
              <h2>How it is measured</h2>
              <p>{detail.indicator.how_to_measure}</p>
            </div>
          </section>

          <details className="card group">
            <summary className="card-heading">
              <h2>Where the numbers come from</h2>
              <span className="group-chevron">
                <Icon name="back" size={18} />
              </span>
            </summary>
            <div className="rule">
              <p>
                The readings on this screen are real, open data that stands in for this crew member. They come from:{' '}
                <strong>{detail.indicator.source.name}</strong>.
              </p>
              <p className="muted">{detail.indicator.source.citation}</p>
              <a className="source-link" href={detail.indicator.source.url} target="_blank" rel="noreferrer">
                {detail.indicator.source.url}
              </a>
            </div>
            {detail.rules.map((rule) => (
              <div key={rule.id} className="rule">
                <strong>Alert: {rule.title}</strong>
                <p>It comes when the value is {describeLimits(rule, detail.indicator.unit)}.</p>
                <p className="muted">Where the limit comes from: {rule.threshold_source}</p>
              </div>
            ))}
            {detail.rules.length === 0 && <p className="muted">This indicator has no alert rule yet.</p>}
          </details>
        </>
      )}
    </main>
  )
}

type Status = { label: string; tone: 'ok' | 'alert' | 'due' }

// The latest reading in two or three words
function getStatus(latest: HistoryReading | undefined, rules: Rule[]): Status {
  if (latest?.broken_rule_id != null) {
    const isFixed = rules.find((rule) => rule.id === latest.broken_rule_id)?.baseline_direction === null
    return { label: isFixed ? 'Out of the normal range' : 'Far from your usual', tone: 'alert' }
  }
  if (rules.some((rule) => rule.baseline_direction === null)) return { label: 'In the normal range', tone: 'ok' }
  if (rules.length > 0) return { label: 'Near your usual', tone: 'ok' }
  return { label: 'No range to compare', tone: 'due' }
}

function describeNormal(rules: Rule[], unit: string | null): string {
  const fixedRule = rules.find((rule) => rule.baseline_direction === null)
  if (fixedRule !== undefined) return `A normal value is ${describeNormalRange(fixedRule, unit)}.`
  if (rules.length > 0) {
    return 'There is no fixed number for everyone. Your reading is compared with your own usual value of the last 4 weeks.'
  }
  return 'There is no agreed normal range for this. What matters is how it changes over time for you.'
}

function describeAction(brokenRule: Rule | undefined, rules: Rule[]): string {
  if (brokenRule !== undefined) return brokenRule.action
  if (rules.length === 0) return 'Nothing. Keep measuring it and watch how it changes.'
  return `Nothing for now. If it leaves the normal range: ${rules[0].action}`
}

const COUNT_UP_MS = 700

// The number climbs to its value when the screen opens
function CountUp({ value, unit }: { value: number; unit: string | null }) {
  const [shown, setShown] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? value : 0,
  )

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const startedAt = performance.now()
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - startedAt) / COUNT_UP_MS)
      // Fast at the start, slow at the end
      setShown(value * (1 - (1 - progress) ** 3))
      if (progress < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <>{formatValue(shown, unit)}</>
}

// How much room the bar leaves on each side of the normal range, as a share of that range
const RANGE_BAR_MARGIN = 0.4
// For a limit with one side only, how wide the bar draws the normal side, as a share of the limit
const ONE_SIDED_SPAN = 0.5

// Where the reading sits against the normal range: a green band, and a marker that slides to the value
function RangeBar({ rule, value, unit }: { rule: Rule; value: number; unit: string | null }) {
  const limit = rule.low ?? rule.high
  if (limit === null) return null
  const span = rule.low !== null && rule.high !== null ? rule.high - rule.low : Math.abs(limit) * ONE_SIDED_SPAN
  const normalLow = rule.low ?? limit - span
  const normalHigh = rule.high ?? limit + span
  const barStart = Math.min(normalLow - span * RANGE_BAR_MARGIN, value)
  const barEnd = Math.max(normalHigh + span * RANGE_BAR_MARGIN, value)
  const toPercent = (amount: number) => ((amount - barStart) / (barEnd - barStart)) * 100
  const bandStart = rule.low === null ? 0 : toPercent(rule.low)
  const bandEnd = rule.high === null ? 100 : toPercent(rule.high)

  return (
    <div className="range-bar" role="img" aria-label={`Your reading against the normal range, ${describeNormalRange(rule, unit)}`}>
      <div className="range-track">
        <span className="range-band" style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }} />
        <span className="range-marker" style={{ left: `${toPercent(value)}%` }} />
      </div>
      <div className="range-labels">
        {rule.low !== null && <span style={{ left: `${bandStart}%` }}>{formatValue(rule.low, null)}</span>}
        {rule.high !== null && <span style={{ left: `${bandEnd}%` }}>{formatValue(rule.high, null)}</span>}
      </div>
      <p className="muted">The green band is the normal range. The marker is your reading.</p>
    </div>
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
  else if (fixedRule !== undefined) sentences.push('It is inside the normal range.')
  else if (rules.length > 0) sentences.push('No alert: it is not far from your own usual value.')
  else sentences.push('It has no normal range to compare with. Look at how it moves in the chart below.')

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
