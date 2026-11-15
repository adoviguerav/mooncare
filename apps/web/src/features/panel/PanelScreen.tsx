import { useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon.tsx'
import type { IconName } from '../../components/Icon.tsx'
import { MoodFace } from '../../components/MoodFace.tsx'
import { Sparkline } from '../../components/Sparkline.tsx'
import { BodyMap } from '../body/BodyMap.tsx'
import { CheckinForm } from '../checkin/CheckinForm.tsx'
import { DailyCare } from '../wellbeing/DailyCare.tsx'
import { fetchIndicatorDetail, fetchPanel } from '../../lib/api.ts'
import type { CrewMember, PanelIndicator } from '../../lib/api.ts'
import { getBodySystemStates } from '../../lib/bodySystems.ts'
import type { BodySystemId } from '../../lib/bodySystems.ts'
import { TODAY } from '../../lib/config.ts'
import { addDays, countDaysSince, formatAge, formatTakenAt, formatValue, formatValueParts } from '../../lib/format.ts'
import {
  DAILY_VITAL_IDS,
  GROUPS,
  MOOD_DAY_COUNT_IDS,
  MOOD_ORDER,
  MOOD_PREFIX,
  OTHER_GROUP,
  ROUTINE_TASKS,
  SPARKLINE_DAYS,
  getIconOf,
} from '../../lib/groups.ts'
import type { Group, RoutineTask } from '../../lib/groups.ts'
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
  canLog: boolean
  emergencyRunning: boolean
  onOpenEmergency: () => void
  onOpenIndicator: (indicatorId: string) => void
  onSwitchProfile: () => void
}

export function PanelScreen(props: Props) {
  const { crewMember, onOpenIndicator, onSwitchProfile } = props
  const [savedCheckins, setSavedCheckins] = useState(0)

  return (
    <PanelContent
      key={savedCheckins}
      crewMember={crewMember}
      canLog={props.canLog}
      emergencyRunning={props.emergencyRunning}
      onOpenEmergency={props.onOpenEmergency}
      onOpenIndicator={onOpenIndicator}
      onSwitchProfile={onSwitchProfile}
      onCheckinSaved={() => setSavedCheckins(savedCheckins + 1)}
    />
  )
}

type PanelContentProps = Props & { onCheckinSaved: () => void }

// Remounted with a new key after each saved check-in, so the panel is fetched again
function PanelContent({
  crewMember,
  canLog,
  emergencyRunning,
  onOpenEmergency,
  onOpenIndicator,
  onSwitchProfile,
  onCheckinSaved,
}: PanelContentProps) {
  const { data: panel, error } = useApi(() => fetchPanel(crewMember.id, TODAY))
  const [tab, setTab] = useState<Tab>(getInitialTab)

  function openTab(nextTab: Tab) {
    sessionStorage.setItem(TAB_STORAGE_KEY, nextTab)
    setTab(nextTab)
    window.scrollTo(0, 0)
  }

  // The next profile starts on Today, not on the tab this one left open
  function switchProfile() {
    sessionStorage.removeItem(TAB_STORAGE_KEY)
    onSwitchProfile()
  }

  const indicators = panel?.indicators ?? []
  const isMoodDayCount = (indicator: PanelIndicator) => MOOD_DAY_COUNT_IDS.includes(indicator.id)
  const isMood = (indicator: PanelIndicator) => indicator.id.startsWith(MOOD_PREFIX) && !isMoodDayCount(indicator)
  const moods = indicators
    .filter(isMood)
    .toSorted((a, b) => MOOD_ORDER.indexOf(a.id) - MOOD_ORDER.indexOf(b.id))
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
          <button className="ghost" onClick={switchProfile}>
            Switch profile
          </button>
        </header>

        {emergencyRunning && (
          <button className="card status emergency-return" onClick={onOpenEmergency}>
            <Icon name="alert" size={28} />
            <span>
              <strong>Medical alert in progress</strong>
              <span className="muted">Simulation</span>
            </span>
            <span className="status-link">Open</span>
          </button>
        )}
        {error !== null && <p role="alert">Could not load the panel. {error}</p>}
        {panel === null && error === null && <PanelSkeleton />}
        {panel !== null && tab === 'today' && (
          <TodayTab
            crewMemberId={crewMember.id}
            canLog={canLog}
            indicators={indicators}
            moods={moods}
            moodDayCounts={moodDayCounts}
            measurements={measurements}
            // The mood alert is already inside the mood card, right above
            alerts={alerts.filter((alert) => !isMoodDayCount(alert))}
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
  canLog: boolean
  indicators: PanelIndicator[]
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
  canLog,
  indicators,
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
            <div className="checkin-answer">
              {chosenToday.length === 0 && <span>No mood chosen</span>}
              {chosenToday.map((mood) => (
                <span key={mood.id} className="checkin-mood">
                  <MoodFace moodId={mood.id} size={36} />
                  {mood.name}
                </span>
              ))}
            </div>
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
            <h2>All measurements in range</h2>
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

      <Routines indicators={indicators} />

      <DailyCare crewMemberId={crewMemberId} canLog={canLog} />

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

      <BodySystems indicators={[...measurements, ...moodDayCounts]} onOpenIndicator={onOpenIndicator} />
    </>
  )
}

type BodySystemsProps = { indicators: PanelIndicator[]; onOpenIndicator: (indicatorId: string) => void }

// Every parameter by body system: the map, and under it the parameters of the one system that is open
function BodySystems({ indicators, onOpenIndicator }: BodySystemsProps) {
  const [openId, setOpenId] = useState<BodySystemId | null>(null)
  const states = getBodySystemStates(indicators)
  const open = states.find((state) => state.system.id === openId)

  return (
    <section>
      <h2 className="section-title">Your body</h2>
      <div className="card">
        <BodyMap states={states} selectedId={openId} onSelect={(id) => setOpenId(id === openId ? null : id)} />
        {open !== undefined && (
          <div className="body-detail" role="region" aria-label={open.system.title}>
            <div className="card-heading">
              <span className={open.status === 'alert' ? 'icon-badge icon-badge-alert' : 'icon-badge'}>
                <Icon name={open.system.icon} />
              </span>
              <h2>{open.system.title}</h2>
              <GroupStatus indicators={open.indicators} />
            </div>
            <div className="tiles">
              {open.indicators.map((indicator) => (
                <IndicatorTile key={indicator.id} indicator={indicator} onOpen={() => onOpenIndicator(indicator.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// What the astronaut has to measure by hand, and the sensors that stopped sending data
function Routines({ indicators }: { indicators: PanelIndicator[] }) {
  const tasks = ROUTINE_TASKS.map((task) => getTaskStatus(task, indicators)).filter((task) => task !== null)
  const silentSensors = indicators.filter((indicator) => indicator.measured_by === 'sensor' && indicator.due)
  const dueCount = tasks.filter((task) => task.due).length

  return (
    <section className="card">
      <div className="card-heading">
        <span className="icon-badge">
          <Icon name="list" />
        </span>
        <div>
          <h2>Your routines</h2>
          <p className="origin">A task is done when its reading arrives.</p>
        </div>
        {dueCount === 0 ? (
          <span className="chip chip-ok">Up to date</span>
        ) : (
          <span className="chip chip-due">{dueCount} due today</span>
        )}
      </div>
      <ul className="routines">
        {tasks.map((task) => (
          <li key={task.title} className={task.due ? 'routine routine-due' : 'routine'}>
            <span className="routine-icon">
              <Icon name={task.due ? task.icon : 'ok'} size={18} />
            </span>
            <span className="routine-text">
              <strong>{task.title}</strong>
              <span className="muted">{task.detail}</span>
            </span>
            <span className={task.due ? 'chip chip-due' : 'chip chip-quiet'}>{task.status}</span>
          </li>
        ))}
      </ul>
      {silentSensors.length > 0 && (
        <p className="routine-warning">
          <Icon name="alert" size={18} />
          No new data from a sensor: {silentSensors.map((indicator) => indicator.name).join(', ')}.
        </p>
      )}
    </section>
  )
}

type TaskStatus = { title: string; icon: IconName; due: boolean; detail: string; status: string }

function getTaskStatus(task: RoutineTask, indicators: PanelIndicator[]): TaskStatus | null {
  const measured = indicators.filter((indicator) => task.indicatorIds.includes(indicator.id))
  const cadenceDays = measured[0]?.cadence_days
  if (cadenceDays === undefined || cadenceDays === null) return null

  const due = measured.some((indicator) => indicator.due)
  const readingDays = measured.flatMap((indicator) => (indicator.reading === null ? [] : [indicator.reading.taken_at]))
  const lastReading = readingDays.toSorted().at(-1)
  const every = cadenceDays === 1 ? 'Every day' : `Every ${cadenceDays} days`
  const detail = lastReading === undefined ? `${every}. Never done` : `${every}. Last: ${formatAge(lastReading, TODAY).toLowerCase()}`
  const daysLeft = lastReading === undefined ? 0 : cadenceDays - countDaysSince(lastReading, TODAY)

  let status = 'Due today'
  if (!due) status = lastReading?.startsWith(TODAY) ? 'Done today' : `In ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`
  return { title: task.title, icon: task.icon, due, detail, status }
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
              <Icon name={getIconOf(indicator.id)} />
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
      <span className="tile-head">
        <span className="tile-icon">
          <Icon name={getIconOf(indicator.id)} size={16} />
        </span>
        <span className="tile-name">{indicator.name}</span>
        {brokenRule !== null && <span className="chip chip-alert">Out of range</span>}
      </span>
      {reading === null ? (
        <span className="muted">No reading yet</span>
      ) : (
        <>
          <span className="tile-value">
            {value?.amount}
            {value?.unit !== '' && <span className="tile-unit"> {value?.unit}</span>}
          </span>
          <span className="tile-age">Measured {formatAge(reading.taken_at, TODAY).toLowerCase()}</span>
        </>
      )}
      {children}
    </button>
  )
}
