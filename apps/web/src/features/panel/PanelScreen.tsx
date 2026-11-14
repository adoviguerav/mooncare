import { useState } from 'react'
import { CheckinForm } from '../checkin/CheckinForm.tsx'
import { fetchPanel } from '../../lib/api.ts'
import type { CrewMember, PanelIndicator } from '../../lib/api.ts'
import { TODAY } from '../../lib/config.ts'
import { formatTakenAt, formatValue } from '../../lib/format.ts'
import { useApi } from '../../hooks/useApi.ts'

const MOOD_PREFIX = 'mood_'
const MOOD_CHOSEN = 1
// The mood rule arrives as two more indicators: on how many of the last 14 days the mood was chosen
const MOOD_DAY_COUNT_IDS = ['mood_sad_days_14', 'mood_tense_days_14']

// Which indicators are shown together. An indicator in no group goes under OTHER_GROUP.
const GROUPS = [
  { title: 'Blood', indicatorIds: ['glucose'] },
  { title: 'Heart', indicatorIds: ['heart_rate', 'resting_heart_rate'] },
  { title: 'Activity', indicatorIds: ['very_active_minutes', 'steps'] },
  { title: 'Sleep', indicatorIds: ['sleep_duration', 'sleep_efficiency'] },
  { title: 'Temperature', indicatorIds: ['skin_temperature'] },
  // shortcut: the mood rule is shown as cards of its own; F4 puts it inside the mood card
  { title: 'Mood over the last 14 days', indicatorIds: MOOD_DAY_COUNT_IDS },
]
const OTHER_GROUP = 'Other'

type Props = {
  crewMember: CrewMember
  onOpenIndicator: (indicatorId: string) => void
  onSwitchProfile: () => void
}

export function PanelScreen({ crewMember, onOpenIndicator, onSwitchProfile }: Props) {
  const [savedCheckins, setSavedCheckins] = useState(0)

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
      <PanelContent
        key={savedCheckins}
        crewMemberId={crewMember.id}
        onOpenIndicator={onOpenIndicator}
        onCheckinSaved={() => setSavedCheckins(savedCheckins + 1)}
      />
    </main>
  )
}

type PanelContentProps = {
  crewMemberId: number
  onOpenIndicator: (indicatorId: string) => void
  onCheckinSaved: () => void
}

// Remounted with a new key after each saved check-in, so the panel is fetched again
function PanelContent({ crewMemberId, onOpenIndicator, onCheckinSaved }: PanelContentProps) {
  const { data: panel, error } = useApi(() => fetchPanel(crewMemberId, TODAY))
  const [editingCheckin, setEditingCheckin] = useState(false)

  if (error !== null) return <p role="alert">Could not load the panel. {error}</p>
  if (panel === null) return null

  const isMood = (indicator: PanelIndicator) =>
    indicator.id.startsWith(MOOD_PREFIX) && !MOOD_DAY_COUNT_IDS.includes(indicator.id)
  const moods = panel.indicators.filter(isMood)
  const measurements = panel.indicators.filter((indicator) => !isMood(indicator))
  const withAlert = measurements.filter((indicator) => indicator.broken_rule !== null)
  const withoutAlert = measurements.filter((indicator) => indicator.broken_rule === null)
  const todayMoods = moods.filter((mood) => mood.reading?.taken_at.startsWith(TODAY))
  const chosenToday = todayMoods.filter((mood) => mood.reading?.value === MOOD_CHOSEN)

  return (
    <>
      {todayMoods.length === 0 || editingCheckin ? (
        <CheckinForm
          crewMemberId={crewMemberId}
          date={TODAY}
          moods={moods}
          chosenToday={chosenToday.map((mood) => mood.id)}
          onSaved={onCheckinSaved}
        />
      ) : (
        <div className="card mood-card">
          <span className="card-name">Your mood today</span>
          <span className="card-value">
            {chosenToday.map((mood) => mood.name).join(', ') || 'No mood chosen'}
          </span>
          <button className="link-button" onClick={() => setEditingCheckin(true)}>
            Change
          </button>
        </div>
      )}
      <section>
        <h2>Needs attention</h2>
        {withAlert.length === 0 ? (
          <p className="muted">No alerts today.</p>
        ) : (
          <IndicatorCards indicators={withAlert} onOpenIndicator={onOpenIndicator} />
        )}
      </section>
      {groupIndicators(withoutAlert).map((group) => (
        <section key={group.title}>
          <h2>{group.title}</h2>
          <IndicatorCards indicators={group.indicators} onOpenIndicator={onOpenIndicator} />
        </section>
      ))}
    </>
  )
}

type IndicatorGroup = { title: string; indicators: PanelIndicator[] }

function groupIndicators(indicators: PanelIndicator[]): IndicatorGroup[] {
  const groupedIds = GROUPS.flatMap((group) => group.indicatorIds)
  const groups = [
    ...GROUPS.map((group) => ({
      title: group.title,
      indicators: indicators.filter((indicator) => group.indicatorIds.includes(indicator.id)),
    })),
    { title: OTHER_GROUP, indicators: indicators.filter((indicator) => !groupedIds.includes(indicator.id)) },
  ]
  return groups.filter((group) => group.indicators.length > 0)
}

type IndicatorCardsProps = { indicators: PanelIndicator[]; onOpenIndicator: (indicatorId: string) => void }

function IndicatorCards({ indicators, onOpenIndicator }: IndicatorCardsProps) {
  return (
    <div className="cards">
      {indicators.map((indicator) => (
        <IndicatorCard key={indicator.id} indicator={indicator} onOpen={() => onOpenIndicator(indicator.id)} />
      ))}
    </div>
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
