import { useState } from 'react'
import { NetworkError, api } from '@mooncare/api'
import type { MoodId, PanelIndicator } from '@mooncare/api'
import { HistoryChart, Ring } from '../components/Charts'
import { MOODS, formatReading, isCheckinMood, vitalCards } from '../lib/indicators'
import { queueCheckin, readPendingCheckins } from '../lib/offline'
import { useLoad } from '../lib/useLoad'
import type { Connection, ScreenProps } from './CrewApp'
import { IndicatorCard } from './VitalsScreen'

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
  // Streak, XP and level come from the server: the checklist of the day and everything done up to it
  const checklist = useLoad(() => api.checklist(crewMemberId, today), [crewMemberId, today, pendingCheckins, panel])
  const progress = checklist.data?.progress

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
                <span>{progress ? `${progress.streak}-day check-in streak` : '…'}</span>
                <span>{progress ? `Level ${progress.level} astronaut` : ''}</span>
              </div>
              <div className="xp">
                <i style={{ width: progress ? `${(progress.level_xp / progress.next_level_xp) * 100}%` : '0%' }} />
              </div>
              <div className="row">
                <span>{progress ? `${progress.xp.toLocaleString('en')} XP` : ''}</span>
                <span>
                  {progress ? `${(progress.next_level_xp - progress.level_xp).toLocaleString('en')} XP to Level ${progress.level + 1}` : ''}
                </span>
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
        {checkedInToday(panel.indicators, crewMemberId, today) ? (
          <CheckinDone indicators={panel.indicators} crewMemberId={crewMemberId} today={today} />
        ) : (
          <MoodCheckin crewMemberId={crewMemberId} today={today} onSaved={onCheckinSaved} connection={connection} />
        )}
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

/** The moods the server has for today. A reading from an earlier day means no check-in yet today. */
const moodsSavedToday = (indicators: PanelIndicator[], today: string): MoodId[] =>
  indicators
    .filter((indicator) => isCheckinMood(indicator.id) && indicator.reading?.value === 1 && indicator.reading.taken_at.startsWith(today))
    .map((indicator) => indicator.id as MoodId)

/** The moods of today's check-in still waiting on this device to be sent, if any. */
const moodsPendingToday = (crewMemberId: number, today: string): MoodId[] | null =>
  readPendingCheckins().find((pending) => pending.crewMemberId === crewMemberId && pending.date === today)?.moods ?? null

/** The check-in is once a day: done when the server has today's moods, or this device is waiting to send them. */
const checkedInToday = (indicators: PanelIndicator[], crewMemberId: number, today: string) =>
  moodsSavedToday(indicators, today).length > 0 || moodsPendingToday(crewMemberId, today) !== null

/** What replaces the check-in once it is done for the day. It comes back the next morning. */
function CheckinDone({ indicators, crewMemberId, today }: { indicators: PanelIndicator[]; crewMemberId: number; today: string }) {
  const pending = moodsPendingToday(crewMemberId, today)
  const moods = pending ?? moodsSavedToday(indicators, today)
  const labels = MOODS.filter((mood) => moods.includes(mood.id))
  return (
    <div className="card" role="status">
      <h2 style={{ marginBottom: 4 }}>Check-in done for today ✓</h2>
      <p className="note" style={{ margin: 0 }}>
        {labels.map((mood) => `${mood.face} ${mood.label}`).join('  ·  ')}
      </p>
      <p className="note">
        {pending ? 'Saved on this device; it will be sent when the base server answers. ' : ''}
        See you tomorrow morning for the next one.
      </p>
    </div>
  )
}

function MoodCheckin({
  crewMemberId,
  today,
  onSaved,
  connection,
}: {
  crewMemberId: number
  today: string
  onSaved: () => void
  connection: Connection
}) {
  const [chosen, setChosen] = useState<MoodId[]>([])
  const [message, setMessage] = useState('')
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
