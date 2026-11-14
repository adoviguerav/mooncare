import { useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon.tsx'
import type { IconName } from '../../components/Icon.tsx'
import { Sparkline } from '../../components/Sparkline.tsx'
import { CheckinForm } from '../checkin/CheckinForm.tsx'
import { fetchIndicatorDetail, fetchPanel } from '../../lib/api.ts'
import type { CrewMember, PanelIndicator } from '../../lib/api.ts'
import { TODAY } from '../../lib/config.ts'
import { addDays, formatAge, formatTakenAt, formatValue, formatValueParts } from '../../lib/format.ts'
import {
  DAILY_VITAL_IDS,
  GROUPS,
  MOOD_DAY_COUNT_IDS,
  MOOD_PREFIX,
  OTHER_GROUP,
  SPARKLINE_DAYS,
  getGroupOf,
} from '../../lib/groups.ts'
import type { Group } from '../../lib/groups.ts'
import { useApi } from '../../hooks/useApi.ts'

const MOOD_CHOSEN = 1
// Any mood indicator works to find the days with a check-in: a check-in saves them all
const CHECKIN_MARKER_ID = 'mood_neutral'
const STREAK_LOOKBACK_DAYS = 120
// The tab survives opening an indicator and coming back, which remounts the panel
const TAB_STORAGE_KEY = 'panel-tab'

type Tab = 'today' | 'data' | 'alerts'
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'data', label: 'Data', icon: 'database' },
  { id: 'alerts', label: 'Alerts', icon: 'alert' },
]

type Props = {
  crewMember: CrewMember
  onOpenIndicator: (indicatorId: string) => void
  onSwitchProfile: () => void
}

export function PanelScreen({ crewMember, onOpenIndicator, onSwitchProfile }: Props) {
  const [savedCheckins, setSavedCheckins] = useState(0)

  return (
    <PanelContent
      key={savedCheckins}
      crewMember={crewMember}
      onOpenIndicator={onOpenIndicator}
      onSwitchProfile={onSwitchProfile}
      onCheckinSaved={() => setSavedCheckins(savedCheckins + 1)}
    />
  )
}

type PanelContentProps = Props & { onCheckinSaved: () => void }

// Remounted with a new key after each saved check-in, so the panel is fetched again
function PanelContent({ crewMember, onOpenIndicator, onSwitchProfile, onCheckinSaved }: PanelContentProps) {
  const { data: panel, error } = useApi(() => fetchPanel(crewMember.id, TODAY))
  const [tab, setTab] = useState<Tab>(getInitialTab)

  function openTab(nextTab: Tab) {
    sessionStorage.setItem(TAB_STORAGE_KEY, nextTab)
    setTab(nextTab)
    window.scrollTo(0, 0)
  }

  const indicators = panel?.indicators ?? []
  const isMoodDayCount = (indicator: PanelIndicator) => MOOD_DAY_COUNT_IDS.includes(indicator.id)
  const isMood = (indicator: PanelIndicator) => indicator.id.startsWith(MOOD_PREFIX) && !isMoodDayCount(indicator)
  const moods = indicators.filter(isMood)
  const moodDayCounts = indicators.filter(isMoodDayCount)
  const measurements = indicators.filter((indicator) => !isMood(indicator) && !isMoodDayCount(indicator))
  const alerts = indicators.filter((indicator) => indicator.broken_rule !== null)

  return (
    <>
      <main className="screen with-tabs">
        <header className="screen-header">
          <div>
            <h1>{crewMember.name}</h1>
            <p className="muted">{formatTakenAt(`${TODAY}T00:00`)}</p>
          </div>
          <button className="ghost" onClick={onSwitchProfile}>
            Switch profile
          </button>
        </header>

        {error !== null && <p role="alert">Could not load the panel. {error}</p>}
        {panel === null && error === null && <PanelSkeleton />}
        {panel !== null && tab === 'today' && (
          <TodayTab
            crewMemberId={crewMember.id}
            moods={moods}
            moodDayCounts={moodDayCounts}
            measurements={measurements}
            alerts={alerts}
            onOpenIndicator={onOpenIndicator}
            onOpenAlerts={() => openTab('alerts')}
            onCheckinSaved={onCheckinSaved}
          />
        )}
        {panel !== null && tab === 'data' && <DataTab measurements={measurements} onOpenIndicator={onOpenIndicator} />}
        {panel !== null && tab === 'alerts' && <AlertsTab alerts={alerts} onOpenIndicator={onOpenIndicator} />}
      </main>

      <nav className="tabs" aria-label="Sections of the panel">
        {TABS.map(({ id, label, icon }) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => openTab(id)}>
            <Icon name={icon} />
            <span>{label}</span>
            {id === 'alerts' && alerts.length > 0 && (
              <span className="tab-count" aria-label={`${alerts.length} alerts`}>
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </nav>
    </>
  )
}

function getInitialTab(): Tab {
  const stored = sessionStorage.getItem(TAB_STORAGE_KEY)
  return TABS.find((tab) => tab.id === stored)?.id ?? 'today'
}

function PanelSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the panel">
      <div className="card skeleton skeleton-tall" />
      <div className="card skeleton" />
      <div className="card skeleton" />
    </div>
  )
}

// --- Today ---

type TodayTabProps = {
  crewMemberId: number
  moods: PanelIndicator[]
  moodDayCounts: PanelIndicator[]
  measurements: PanelIndicator[]
  alerts: PanelIndicator[]
  onOpenIndicator: (indicatorId: string) => void
  onOpenAlerts: () => void
  onCheckinSaved: () => void
}

function TodayTab({
  crewMemberId,
  moods,
  moodDayCounts,
  measurements,
  alerts,
  onOpenIndicator,
  onOpenAlerts,
  onCheckinSaved,
}: TodayTabProps) {
  const [editingCheckin, setEditingCheckin] = useState(false)

  const todayMoods = moods.filter((mood) => mood.reading?.taken_at.startsWith(TODAY))
  const chosenToday = todayMoods.filter((mood) => mood.reading?.value === MOOD_CHOSEN)
  const checkedInToday = todayMoods.length > 0
  const moodAlerts = moodDayCounts.filter((count) => count.broken_rule !== null)
  const dailyVitals = DAILY_VITAL_IDS.flatMap((id) => measurements.filter((indicator) => indicator.id === id))

  return (
    <>
      <section className="card">
        <div className="card-heading">
          <span className="icon-badge">
            <Icon name="smile" />
          </span>
          <h2>How are you today?</h2>
          <CheckinStreak crewMemberId={crewMemberId} checkedInToday={checkedInToday} />
        </div>
        {!checkedInToday || editingCheckin ? (
          <CheckinForm
            crewMemberId={crewMemberId}
            date={TODAY}
            moods={moods}
            chosenToday={chosenToday.map((mood) => mood.id)}
            onSaved={onCheckinSaved}
          />
        ) : (
          <div className="checkin-done">
            <p className="checkin-answer">{chosenToday.map((mood) => mood.name).join(', ') || 'No mood chosen'}</p>
            <button className="ghost" onClick={() => setEditingCheckin(true)}>
              Change
            </button>
          </div>
        )}
        {moodAlerts.map((count) => (
          <button key={count.id} className="mood-alert" onClick={() => onOpenIndicator(count.id)}>
            <strong>{count.broken_rule?.title}</strong>
            <span>{count.broken_rule?.explanation}</span>
            <span>
              <strong>What to do:</strong> {count.broken_rule?.action}
            </span>
          </button>
        ))}
      </section>

      {alerts.length === 0 ? (
        <section className="card status status-ok">
          <Icon name="ok" size={28} />
          <div>
            <h2>All values in range</h2>
            <p className="muted">Nothing needs your attention today.</p>
          </div>
        </section>
      ) : (
        <button className="card status status-alert" onClick={onOpenAlerts}>
          <Icon name="alert" size={28} />
          <span>
            <strong>
              {alerts.length} {alerts.length === 1 ? 'value needs' : 'values need'} attention
            </strong>
            <span className="muted">{alerts.map((alert) => alert.name).join(', ')}</span>
          </span>
          <span className="status-link">See what to do</span>
        </button>
      )}

      <section>
        <h2 className="section-title">Your vitals</h2>
        <div className="tiles tiles-vitals">
          {dailyVitals.map((indicator) => (
            <VitalTile
              key={indicator.id}
              crewMemberId={crewMemberId}
              indicator={indicator}
              onOpen={() => onOpenIndicator(indicator.id)}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function CheckinStreak({ crewMemberId, checkedInToday }: { crewMemberId: number; checkedInToday: boolean }) {
  const { data: detail } = useApi(() =>
    fetchIndicatorDetail(crewMemberId, CHECKIN_MARKER_ID, addDays(TODAY, -STREAK_LOOKBACK_DAYS), TODAY),
  )
  if (detail === null) return null

  const streak = countStreak(
    detail.readings.map((reading) => reading.taken_at.slice(0, 10)),
    checkedInToday,
  )
  return streak === 0 ? null : <span className="streak">{streak}-day streak</span>
}

// Days in a row with a check-in. Before today's check-in the streak is still alive: it counts up to yesterday.
function countStreak(checkinDays: string[], checkedInToday: boolean): number {
  const days = new Set(checkinDays)
  let day = checkedInToday ? TODAY : addDays(TODAY, -1)
  let streak = 0
  while (days.has(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

type VitalTileProps = { crewMemberId: number; indicator: PanelIndicator; onOpen: () => void }

function VitalTile({ crewMemberId, indicator, onOpen }: VitalTileProps) {
  const { data: detail } = useApi(() =>
    fetchIndicatorDetail(crewMemberId, indicator.id, addDays(TODAY, -SPARKLINE_DAYS), TODAY),
  )

  return (
    <IndicatorTile indicator={indicator} onOpen={onOpen}>
      <Sparkline values={detail?.readings.map((reading) => reading.value) ?? []} />
    </IndicatorTile>
  )
}

// --- Data ---

type DataTabProps = { measurements: PanelIndicator[]; onOpenIndicator: (indicatorId: string) => void }

function DataTab({ measurements, onOpenIndicator }: DataTabProps) {
  return (
    <>
      {groupIndicators(measurements).map((group) => (
        // Open from the start only when something in the group needs a look
        <details key={group.title} className="card group" open={group.indicators.some(hasAlert)}>
          <summary className="card-heading">
            <span className="icon-badge">
              <Icon name={group.icon} />
            </span>
            <span>
              <h2>{group.title}</h2>
              {group.origin !== '' && <span className="origin">{group.origin}</span>}
            </span>
            <GroupStatus indicators={group.indicators} />
            <span className="group-chevron">
              <Icon name="back" size={18} />
            </span>
          </summary>
          <div className="tiles">
            {group.indicators.map((indicator) => (
              <IndicatorTile key={indicator.id} indicator={indicator} onOpen={() => onOpenIndicator(indicator.id)} />
            ))}
          </div>
        </details>
      ))}
    </>
  )
}

const hasAlert = (indicator: PanelIndicator) => indicator.broken_rule !== null

function GroupStatus({ indicators }: { indicators: PanelIndicator[] }) {
  const alertCount = indicators.filter(hasAlert).length
  return alertCount === 0 ? (
    <span className="chip chip-quiet">
      {indicators.length} {indicators.length === 1 ? 'value' : 'values'}
    </span>
  ) : (
    <span className="chip chip-alert">{alertCount} out of range</span>
  )
}

type IndicatorGroup = Omit<Group, 'indicatorIds'> & { indicators: PanelIndicator[] }

function groupIndicators(indicators: PanelIndicator[]): IndicatorGroup[] {
  const groupedIds = GROUPS.flatMap((group) => group.indicatorIds)
  const groups = [
    ...GROUPS.map(({ indicatorIds, ...group }) => ({
      ...group,
      // In the order of the group, not of the API
      indicators: indicatorIds.flatMap((id) => indicators.filter((indicator) => indicator.id === id)),
    })),
    { ...OTHER_GROUP, indicators: indicators.filter((indicator) => !groupedIds.includes(indicator.id)) },
  ]
  return groups.filter((group) => group.indicators.length > 0)
}

// --- Alerts ---

type AlertsTabProps = { alerts: PanelIndicator[]; onOpenIndicator: (indicatorId: string) => void }

function AlertsTab({ alerts, onOpenIndicator }: AlertsTabProps) {
  if (alerts.length === 0) {
    return (
      <section className="card status status-ok">
        <Icon name="ok" size={28} />
        <div>
          <h2>No alerts today</h2>
          <p className="muted">Every value with a limit is inside it.</p>
        </div>
      </section>
    )
  }

  return (
    <>
      {alerts.map((indicator) => (
        <button key={indicator.id} className="card alert-card" onClick={() => onOpenIndicator(indicator.id)}>
          <span className="card-heading">
            <span className="icon-badge icon-badge-alert">
              <Icon name={getGroupOf(indicator.id).icon} />
            </span>
            <span>
              <strong className="alert-title">{indicator.broken_rule?.title}</strong>
              <span className="muted">
                {indicator.name}
                {indicator.reading !== null && `, ${formatAge(indicator.reading.taken_at, TODAY).toLowerCase()}`}
              </span>
            </span>
            {indicator.reading !== null && (
              <span className="alert-value">{formatValue(indicator.reading.value, indicator.unit)}</span>
            )}
          </span>
          <span className="alert-text">{indicator.broken_rule?.explanation}</span>
          <span className="alert-action">
            <strong>What to do</strong>
            {indicator.broken_rule?.action}
          </span>
        </button>
      ))}
    </>
  )
}

// --- Shared tile ---

type IndicatorTileProps = { indicator: PanelIndicator; onOpen: () => void; children?: ReactNode }

function IndicatorTile({ indicator, onOpen, children }: IndicatorTileProps) {
  const { reading, broken_rule: brokenRule } = indicator
  const value = reading === null ? null : formatValueParts(reading.value, indicator.unit)

  return (
    <button className={brokenRule === null ? 'tile' : 'tile tile-alert'} onClick={onOpen}>
      <span className="tile-name">{indicator.name}</span>
      {reading === null ? (
        <span className="muted">No reading yet</span>
      ) : (
        <>
          <span className="tile-value">
            {value?.amount}
            {value?.unit !== '' && <span className="tile-unit"> {value?.unit}</span>}
          </span>
          <span className="tile-age">{formatAge(reading.taken_at, TODAY)}</span>
        </>
      )}
      {brokenRule !== null && <span className="chip chip-alert">Out of range</span>}
      {children}
    </button>
  )
}
