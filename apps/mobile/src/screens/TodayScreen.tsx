import { useState } from 'react'
import { NetworkError, api } from '@mooncare/api'
import type { MoodId, PanelIndicator } from '@mooncare/api'
import { HistoryChart, Ring } from '../components/Charts'
import { addDays } from '../lib/dates'
import { MOODS, formatReading, isCheckinMood, vitalCards } from '../lib/indicators'
import { queueCheckin } from '../lib/offline'
import { useLoad } from '../lib/useLoad'
import type { Connection, ScreenProps } from './CrewApp'
import { IndicatorCard } from './VitalsScreen'

const STREAK_WINDOW_DAYS = 60

export function TodayScreen({
  me,
  crewMemberId,
  today,
  panel,
  onOpenIndicator,
  onCheckinSaved,
  pendingCheckins,
  connection,
}: ScreenProps & { pendingCheckins: number; connection: Connection }) {
  const alerts = panel.indicators.filter((indicator) => indicator.broken_rule)
  const cards = vitalCards(panel.indicators)
  const withReading = cards.filter((indicator) => indicator.reading)
  // The ring counts the vital signs with a reading, plus the mood rules: the moods are private, their alerts are not
  const moodAlerts = alerts.filter((indicator) => !vitalCards([indicator]).length).length
  const checked = withReading.length + moodAlerts
  const inRange = withReading.filter((indicator) => !indicator.broken_rule).length
  const share = checked ? Math.round((inRange / checked) * 100) : 0
  const streak = useLoad(() => loadStreak(crewMemberId, today), [crewMemberId, today, pendingCheckins])

  return (
    <main>
      <section className="hero">
        <div className="card">
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 190 }}>
              <h2>Good morning, {me.role === 'commander' ? `Commander ${me.display_name}` : me.display_name}</h2>
              <p className="note" style={{ marginTop: -6 }}>
                {alerts.length === 0
                  ? 'Every parameter with a rule is inside its limits today.'
                  : `${alerts.length} parameter${alerts.length > 1 ? 's need' : ' needs'} your attention today.`}
              </p>
              <div className="row">
                <span>{streak.data == null ? '…' : `${streak.data}-day check-in streak`}</span>
                <span>
                  Level 8 astronaut <span className="demo">DEMO</span>
                </span>
              </div>
              <div className="xp">
                <i style={{ width: '87%' }} />
              </div>
              <div className="row">
                <span>2,450 XP</span>
                <span>350 XP to Level 9</span>
              </div>
            </div>
            <div className="glance" role="group" aria-label="Today at a glance">
              <Ring share={share} text={`${inRange}/${checked}`} color={alerts.length ? 'var(--warn)' : 'var(--cy)'} />
              <div className="note" style={{ textAlign: 'center', margin: '2px 0 0', fontSize: 12 }}>
                in range
              </div>
            </div>
          </div>
        </div>
        <MoodCheckin
          key={savedMoodsKey(panel.indicators, today)}
          crewMemberId={crewMemberId} today={today} indicators={panel.indicators} onSaved={onCheckinSaved} connection={connection} />
      </section>

      <section className="card nova">
        <div style={{ fontSize: 28 }} aria-hidden="true">
          🤖
        </div>
        <div>
          <b>Dr. Nova</b> <span className="note">· from the alert rules, not an AI yet</span>
          {alerts.length === 0 ? (
            <p style={{ margin: '4px 0 0' }}>Nothing out of range today. Keep your routine and your check-in streak.</p>
          ) : (
            <p style={{ margin: '4px 0 0' }}>
              <b style={{ color: 'var(--warn)' }}>{alerts[0].broken_rule!.title}.</b> {alerts[0].broken_rule!.explanation}{' '}
              <b>What to do:</b> {alerts[0].broken_rule!.action}
            </p>
          )}
        </div>
      </section>

      <h2 className="sec">Morning telemetry</h2>
      <p className="note">
        {alerts.length} alert{alerts.length === 1 ? '' : 's'} · {withReading.length} parameters with a reading. Tap one for its
        history, rule and source.
      </p>
      <div className="grid">
        {[...alerts.filter((indicator) => !isCheckinMood(indicator.id)), ...cards.filter((indicator) => !indicator.broken_rule)]
          .slice(0, 6)
          .map((indicator) => (
            <IndicatorCard key={indicator.id} indicator={indicator} onOpen={onOpenIndicator} />
          ))}
      </div>

      <HeartRateCard crewMemberId={crewMemberId} today={today} restingHeartRate={panel.indicators.find((indicator) => indicator.id === 'resting_heart_rate')} />
    </main>
  )
}

/** Consecutive days, up to today, with a check-in. A day counts when at least one mood was chosen. */
async function loadStreak(crewMemberId: number, today: string): Promise<number> {
  const from = addDays(today, -STREAK_WINDOW_DAYS)
  const histories = await Promise.all(MOODS.map((mood) => api.indicator(crewMemberId, mood.id, from, today)))
  const days = new Set(histories.flatMap((history) => history.readings.filter((reading) => reading.value === 1).map((reading) => reading.taken_at.slice(0, 10))))
  let day = days.has(today) ? today : addDays(today, -1) // today's check-in may still be to come
  let streak = 0
  while (days.has(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

/** Changes when the moods saved for today change, so the check-in starts again from what the server has. */
const savedMoodsKey = (indicators: PanelIndicator[], today: string) =>
  indicators
    .filter((indicator) => isCheckinMood(indicator.id) && indicator.reading?.value === 1 && indicator.reading.taken_at.startsWith(today))
    .map((indicator) => indicator.id)
    .join()

function MoodCheckin({
  crewMemberId,
  today,
  indicators,
  onSaved,
  connection,
}: {
  crewMemberId: number
  today: string
  indicators: PanelIndicator[]
  onSaved: () => void
  connection: Connection
}) {
  // The moods saved for today, from the panel. A reading from an earlier day means no check-in yet today.
  const savedToday = indicators
    .filter((indicator) => isCheckinMood(indicator.id) && indicator.reading?.value === 1 && indicator.reading.taken_at.startsWith(today))
    .map((indicator) => indicator.id as MoodId)
  const [chosen, setChosen] = useState<MoodId[]>(savedToday)
  const [message, setMessage] = useState(savedToday.length ? 'Your check-in for today is saved. You can change it.' : '')
  const [busy, setBusy] = useState(false)

  const toggle = (mood: MoodId) => setChosen((current) => (current.includes(mood) ? current.filter((id) => id !== mood) : [...current, mood]))

  async function save() {
    setBusy(true)
    try {
      await api.saveCheckin(crewMemberId, today, chosen)
      setMessage('Saved. Thank you: your streak keeps going.')
      onSaved()
    } catch (error) {
      if (error instanceof NetworkError) {
        queueCheckin({ crewMemberId, date: today, moods: chosen, savedAt: new Date().toISOString() })
        setMessage('Saved on this device. It will be sent when the base server answers again.')
        onSaved()
      } else {
        setMessage(error instanceof Error ? error.message : 'It could not be saved.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>How are you feeling today?</h2>
      <div className="moods" role="group" aria-label="Moods, choose one or more">
        {MOODS.map((mood) => (
          <button key={mood.id} type="button" aria-pressed={chosen.includes(mood.id)} onClick={() => toggle(mood.id)}>
            <span className="face" aria-hidden="true">
              {mood.face}
            </span>
            {mood.label}
          </button>
        ))}
      </div>
      <button className="primary" type="button" style={{ marginTop: 12 }} disabled={busy || chosen.length === 0} onClick={save}>
        {busy ? 'Saving…' : connection.kind === 'online' ? 'Save check-in' : 'Save on this device'}
      </button>
      <p className="note" style={{ minHeight: 21 }} role="status">
        {message || 'More than one is fine. Your moods stay private: only a sustained pattern raises an alert, and it never diagnoses.'}
      </p>
    </div>
  )
}

function HeartRateCard({ crewMemberId, today, restingHeartRate }: { crewMemberId: number; today: string; restingHeartRate?: PanelIndicator }) {
  const history = useLoad(() => api.indicator(crewMemberId, 'heart_rate', today, today), [crewMemberId, today])
  const baseline = restingHeartRate?.reading?.value ?? null
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2>Heart rate through the day</h2>
      <div className="scroll">
        {history.data ? (
          <HistoryChart readings={history.data.readings} baseline={baseline} hourly height={160} label="Hourly heart rate today" />
        ) : (
          <p className="note">{history.error ? 'The history cannot be loaded right now.' : 'Loading…'}</p>
        )}
      </div>
      <p className="note">
        Average heart rate of each hour, in bpm.
        {baseline != null && ` The dotted line is your resting heart rate (${restingHeartRate && formatReading(restingHeartRate)}).`} Source:
        LifeSnaps wearable data.
      </p>
    </section>
  )
}
