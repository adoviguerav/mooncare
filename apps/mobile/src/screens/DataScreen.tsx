import { api } from '@mooncare/api'
import { describeLimits, formatReading, moduleOf, priorityOf, vitalCards } from '../lib/indicators'
import { useLoad } from '../lib/useLoad'
import type { ScreenProps } from './CrewApp'

/** Every monitored parameter with its latest value, rule and source (R11): anyone can check the science. */
export function DataScreen({ crewMemberId, today, panel, onOpenIndicator }: ScreenProps) {
  const cards = vitalCards(panel.indicators)
  const details = useLoad(
    () => Promise.all(cards.map((indicator) => api.indicator(crewMemberId, indicator.id, today, today))),
    [crewMemberId, today, cards.map((indicator) => indicator.id).join()],
  )
  const byId = new Map(details.data?.map((detail) => [detail.indicator.id, detail]))

  return (
    <main>
      <h2 className="sec">Health parameters</h2>
      <p className="note" style={{ marginTop: -6 }}>
        What is monitored, its latest reading, the rule behind its alert and where the data comes from. Priority runs
        from L1 (severe) to L4 and is a proposal still to confirm.
      </p>
      <div className="card scroll" style={{ marginBottom: 16, padding: 6 }}>
        <table className="ptab">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>System</th>
              <th>Latest</th>
              <th>Alert outside</th>
              <th>Priority</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((indicator) => {
              const detail = byId.get(indicator.id)
              return (
                <tr key={indicator.id} className="cr" tabIndex={0} onClick={() => onOpenIndicator(indicator.id)} onKeyDown={(event) => event.key === 'Enter' && onOpenIndicator(indicator.id)}>
                  <td>{indicator.name}</td>
                  <td>{moduleOf(indicator.id)}</td>
                  <td className={indicator.broken_rule ? 'f' : undefined}>{formatReading(indicator)}</td>
                  <td>
                    {!detail ? '…' : detail.rules.length ? detail.rules.map((rule) => describeLimits(rule, indicator.unit)).join('; ') : 'No rule yet'}
                  </td>
                  <td>{priorityOf(indicator.id) ?? '—'}</td>
                  <td>{detail?.indicator.source.name ?? '…'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {details.error && <p className="err">Rules and sources cannot be loaded right now.</p>}
      <p className="note">
        Mood is a private self-report: its six answers are not listed here. Its only rule counts how many of the last 14
        days were sad or tense, and asks for a conversation, never a diagnosis.
      </p>
    </main>
  )
}
