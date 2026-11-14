import { fetchPanel } from '../../lib/api.ts'
import type { CrewMember, PanelIndicator } from '../../lib/api.ts'
import { TODAY } from '../../lib/config.ts'
import { formatTakenAt, formatValue } from '../../lib/format.ts'
import { useApi } from '../../hooks/useApi.ts'

type Props = {
  crewMember: CrewMember
  onOpenIndicator: (indicatorId: string) => void
  onSwitchProfile: () => void
}

export function PanelScreen({ crewMember, onOpenIndicator, onSwitchProfile }: Props) {
  const { data: panel, error } = useApi(() => fetchPanel(crewMember.id, TODAY))

  return (
    <main className="screen">
      <header className="screen-header">
        <div>
          <h1>{crewMember.name}</h1>
          <p className="muted">{formatTakenAt(`${TODAY}T00:00`)}</p>
        </div>
        <button className="link-button" onClick={onSwitchProfile}>
          Switch profile
        </button>
      </header>
      {error !== null && <p role="alert">Could not load the panel. {error}</p>}
      <div className="cards">
        {panel?.indicators.map((indicator) => (
          <IndicatorCard
            key={indicator.id}
            indicator={indicator}
            onOpen={() => onOpenIndicator(indicator.id)}
          />
        ))}
      </div>
    </main>
  )
}

function IndicatorCard({ indicator, onOpen }: { indicator: PanelIndicator; onOpen: () => void }) {
  const { reading, broken_rule: brokenRule } = indicator

  return (
    <button className={brokenRule === null ? 'card' : 'card card-alert'} onClick={onOpen}>
      <span className="card-name">{indicator.name}</span>
      {reading === null ? (
        <span className="muted">No reading yet</span>
      ) : (
        <>
          <span className="card-value">{formatValue(reading.value, indicator.unit)}</span>
          <span className="muted">{formatTakenAt(reading.taken_at)}</span>
        </>
      )}
      {brokenRule !== null && (
        <span className="alert-box">
          <strong>⚠ {brokenRule.title}</strong>
          <span>{brokenRule.explanation}</span>
          <span>
            <strong>What to do:</strong> {brokenRule.action}
          </span>
        </span>
      )}
    </button>
  )
}
