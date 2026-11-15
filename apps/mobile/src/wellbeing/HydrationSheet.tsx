import { useEffect, useRef, useState } from 'react'
import { ApiError, NetworkError, api } from '@mooncare/api'
import type { HydrationDay } from '@mooncare/api'
import { Sheet } from '../components/Sheet'
import { createFountain } from './fountainArt'
import type { Fountain } from './fountainArt'

// The drink sizes of Becky's prototype
const SIZES: [number, string][] = [
  [100, 'Sip'],
  [200, 'Cup'],
  [300, 'Glass'],
  [500, 'Bottle'],
]
const PACE_START_HOUR = 7
const PACE_HOURS = 15
const AHEAD_ML = 500
const BEHIND_ML = 300
const PAST_GOAL = 1.3

/** Where the fountain should be by now: from nothing at 07:00 to the goal at 22:00, on this device's clock */
export function paceFor(goalMl: number, at = new Date()): number {
  const hours = at.getHours() + at.getMinutes() / 60
  return goalMl * Math.max(0, Math.min(1, (hours - PACE_START_HOUR) / PACE_HOURS))
}

export function hydrationTag(day: HydrationDay): ['ok' | 'warn', string] {
  if (!day.goal) return ['ok', 'No goal']
  if (day.total_ml >= day.goal.ml) return ['ok', 'Goal reached']
  const diff = day.total_ml - paceFor(day.goal.ml)
  if (diff < -BEHIND_ML) return ['warn', 'Behind pace']
  return ['ok', diff > AHEAD_ML ? 'Ahead of pace' : 'On pace']
}

function message(day: HydrationDay): string {
  const goal = day.goal
  if (!goal) return 'There is no reference goal for this profile. Log your drinks; the flight surgeon sets your target.'
  const litres = (goal.ml / 1000).toFixed(1)
  if (day.total_ml > goal.ml * PAST_GOAL) return 'You are well past today’s goal. More is not better. Ask the flight surgeon if you are still thirsty.'
  if (day.total_ml >= goal.ml) return 'Fountain full. You have reached today’s goal. Well done.'
  if (day.total_ml === 0) return `Fill the fountain with today’s water. Your goal is ${litres} L.`
  const diff = day.total_ml - paceFor(goal.ml)
  return `${Math.round((day.total_ml / goal.ml) * 100)}% full. ${goal.ml - day.total_ml} ml to go.${
    diff > AHEAD_ML ? ' Spread your drinks through the day.' : diff < -BEHIND_ML ? ' A drink now will catch you up.' : ''
  }`
}

/** Becky's hydration fountain: log each drink and watch it fill towards the day's reference goal. */
export function HydrationSheet({
  crewMemberId,
  today,
  initial,
  canLog,
  onChange,
  onClose,
}: {
  crewMemberId: number
  today: string
  initial: HydrationDay
  canLog: boolean
  onChange: (day: HydrationDay) => void
  onClose: () => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const fountain = useRef<Fountain | null>(null)
  const [day, setDay] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const first = useRef(true)

  useEffect(() => {
    if (!svg.current) return
    fountain.current = createFountain(svg.current)
    return () => fountain.current?.destroy()
  }, [])

  useEffect(() => {
    const goal = day.goal?.ml ?? 0
    fountain.current?.draw(
      {
        level: goal ? Math.min(1, day.total_ml / goal) : 0,
        pace: goal ? paceFor(goal) / goal : 0,
        full: goal > 0 && day.total_ml >= goal,
      },
      first.current,
    )
    first.current = false
  }, [day])

  async function send(action: () => Promise<HydrationDay>, pourMl?: number) {
    setBusy(true)
    setError('')
    try {
      const next = await action()
      if (pourMl) fountain.current?.pour(pourMl)
      setDay(next)
      onChange(next)
    } catch (failure) {
      setError(
        failure instanceof NetworkError
          ? 'The base server cannot be reached. Try again when it answers.'
          : failure instanceof ApiError
            ? failure.message
            : 'It could not be saved.',
      )
    } finally {
      setBusy(false)
    }
  }

  const [tone, tag] = hydrationTag(day)
  const goal = day.goal
  const full = goal !== null && day.total_ml >= goal.ml
  return (
    <Sheet label="Hydration fountain" onClose={onClose}>
      <h2 className="h2i">
        <span className="pic" aria-hidden="true">
          <DropIcon />
        </span>
        Hydration fountain
      </h2>
      <svg
        ref={svg}
        className={`fountain${full ? ' full' : ''}`}
        viewBox="0 -34 300 244"
        role="img"
        aria-label={`Hydration fountain, ${goal ? Math.round(Math.min(1, day.total_ml / goal.ml) * 100) : 0}% full`}
      />
      <div className="hydnum">
        <b>{(day.total_ml / 1000).toFixed(1)}</b>
        <span>{goal ? <> of <b>{(goal.ml / 1000).toFixed(1)}</b> L today</> : ' L today'}</span>
        <span className={`tag ${tone}`}>{tag}</span>
      </div>
      <p className="hydmsg">{message(day)}</p>
      {canLog ? (
        <div className="hydbtns" role="group" aria-label="Log a drink">
          {SIZES.map(([ml, label]) => (
            <button key={ml} type="button" disabled={busy} onClick={() => void send(() => api.logDrink(crewMemberId, today, ml), ml)}>
              {label}
              <small>{ml} ml</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="note">Only the crew member can log their own drinks.</p>
      )}
      <div className="hydrow">
        <span className="pill2">
          <span>
            <b>{day.full_days_in_a_row}</b> {day.full_days_in_a_row === 1 ? 'day' : 'days'} in a row with a full fountain
          </span>
        </span>
        {canLog && (
          <button
            type="button"
            className="linkbtn"
            disabled={busy || day.drinks.length === 0}
            onClick={() => void send(() => api.undoDrink(crewMemberId, today))}
          >
            Undo last drink
          </button>
        )}
      </div>
      <p className="err" role="alert">
        {error}
      </p>
      <p className="note hydsrc">
        {goal
          ? `Goal: ${(goal.ml / 1000).toFixed(1)} L from drinks, ${Math.round(goal.drinks_share * 100)}% of an adequate total water intake of ${(goal.total_water_ml / 1000).toFixed(1)} L a day. Source: ${goal.source}`
          : 'No reference goal: the profile has no sex recorded, and the reference differs for women and men.'}
      </p>
    </Sheet>
  )
}

export function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.2c3.4 4.1 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.1-5.9 5.5-10Z" />
    </svg>
  )
}
