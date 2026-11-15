import { useState } from 'react'
import { api } from '@mooncare/api'
import { LearnMore } from '@mooncare/web/features/indicator/LearnMore.tsx'
import { HistoryChart } from '../components/Charts'
import { Sheet } from '../components/Sheet'
import { addDays } from '../lib/dates'
import { describeLimits, formatValue, moduleOf, priorityOf, shownUnit } from '../lib/indicators'
import { useLoad } from '../lib/useLoad'

const RANGES = [7, 30, 90]

/** One indicator's history, rule and source: R4, R7, R10 and R11 on one card. */
export function IndicatorSheet({
  crewMemberId,
  indicatorId,
  today,
  onOpenIndicator,
  onClose,
}: {
  crewMemberId: number
  indicatorId: string
  today: string
  onOpenIndicator: (indicatorId: string) => void
  onClose: () => void
}) {
  const [days, setDays] = useState(30)
  const detail = useLoad(() => api.indicator(crewMemberId, indicatorId, addDays(today, -days + 1), today), [crewMemberId, indicatorId, today, days])
  const data = detail.data
  const values = data?.readings.map((reading) => reading.value) ?? []
  const latest = data?.readings.at(-1)
  const hourly = indicatorId === 'heart_rate'

  return (
    <Sheet label="Parameter history" onClose={onClose}>
      <span className="tag mute">
        {moduleOf(indicatorId)} · priority {priorityOf(indicatorId) ?? '—'} (proposed)
      </span>
      <h2>{data?.indicator.name ?? 'Loading…'}</h2>
      {latest && data && (
        <div className="val">
          {formatValue(latest.value, data.indicator.unit)}
          <small> {shownUnit(latest.value, data.indicator.unit)}</small>
        </div>
      )}
      <div className="chips" role="group" aria-label="Time range" style={{ margin: '12px 0' }}>
        {RANGES.map((range) => (
          <button key={range} type="button" aria-pressed={days === range} onClick={() => setDays(range)}>
            {range} days
          </button>
        ))}
      </div>
      {detail.error && <p className="err">The history cannot be loaded right now.</p>}
      {data && (
        <>
          <HistoryChart readings={data.readings} rules={data.rules} hourly={hourly && days <= 7} label={`${data.indicator.name}, last ${days} days`} />
          {values.length > 0 && (
            <div className="stats">
              <div>
                <span>Lowest</span>
                <b>{formatValue(Math.min(...values), data.indicator.unit)}</b>
              </div>
              <div>
                <span>Average</span>
                <b>{formatValue(values.reduce((sum, value) => sum + value, 0) / values.length, data.indicator.unit)}</b>
              </div>
              <div>
                <span>Highest</span>
                <b>{formatValue(Math.max(...values), data.indicator.unit)}</b>
              </div>
            </div>
          )}
          <dl className="pd">
            <dt>Why it matters</dt>
            <dd>{data.indicator.why_it_matters}</dd>
            <dt>How it is measured</dt>
            <dd>{data.indicator.how_to_measure}</dd>
            <dt>Rule</dt>
            {data.rules.length === 0 ? (
              <dd>No rule yet: this parameter never raises an alert until a limit with a source is agreed.</dd>
            ) : (
              data.rules.map((rule) => (
                <dd key={rule.id} style={{ marginBottom: 8 }}>
                  <b>{rule.title}</b>: alert {rule.baseline_direction === null ? 'outside' : 'when'} {describeLimits(rule, data.indicator.unit)}. {rule.explanation}{' '}
                  <b>What to do:</b> {rule.action}
                  <br />
                  <span className="note">Where the limit comes from: {rule.threshold_source}</span>
                </dd>
              ))
            )}
            <dt>Source of the data</dt>
            <dd>
              <a href={data.indicator.source.url} target="_blank" rel="noreferrer">
                {data.indicator.source.name}
              </a>
              <br />
              <span className="note">{data.indicator.source.citation}</span>
            </dd>
          </dl>
          {/* The study notes are the dashboard's own, with its look */}
          <div className="web-ui">
            <LearnMore indicatorId={indicatorId} name={data.indicator.name} onOpenIndicator={onOpenIndicator} />
          </div>
        </>
      )}
    </Sheet>
  )
}
