import { useEffect, useRef, useState } from 'react'
import { createFountain } from '../../../../mobile/src/wellbeing/fountainArt.ts'
import type { Fountain } from '../../../../mobile/src/wellbeing/fountainArt.ts'
import { ApiError, logDrink, undoDrink } from '../../lib/api.ts'
import type { HydrationDay } from '../../lib/api.ts'
import { TODAY } from '../../lib/config.ts'
import { DRINK_SIZES, describeGoalSource, describeHydration, formatLitres, getHydrationTag, getPaceMl } from './hydration.ts'
import { Sheet } from './Sheet.tsx'

type Props = {
  crewMemberId: number
  initialDay: HydrationDay
  canLog: boolean
  onChange: (day: HydrationDay) => void
  onClose: () => void
}

/** The hydration fountain: log each drink and watch it fill towards the day's reference goal. */
export function HydrationSheet({ crewMemberId, initialDay, canLog, onChange, onClose }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const fountain = useRef<Fountain | null>(null)
  const [day, setDay] = useState(initialDay)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isFirstDraw = useRef(true)

  useEffect(() => {
    if (svg.current === null) return
    fountain.current = createFountain(svg.current)
    return () => fountain.current?.destroy()
  }, [])

  useEffect(() => {
    const goalMl = day.goal?.ml ?? 0
    fountain.current?.draw(
      {
        level: goalMl > 0 ? Math.min(1, day.total_ml / goalMl) : 0,
        pace: goalMl > 0 ? getPaceMl(goalMl) / goalMl : 0,
        full: goalMl > 0 && day.total_ml >= goalMl,
      },
      isFirstDraw.current,
    )
    isFirstDraw.current = false
  }, [day])

  async function save(send: () => Promise<HydrationDay>, pouredMl?: number) {
    setSaving(true)
    setError('')
    try {
      const savedDay = await send()
      if (pouredMl !== undefined) fountain.current?.pour(pouredMl)
      setDay(savedDay)
      onChange(savedDay)
    } catch (failure) {
      if (failure instanceof ApiError) setError(failure.message)
      // fetch rejects with a TypeError when the request never reaches the server
      else if (failure instanceof TypeError) setError('The base server cannot be reached. Try again when it answers.')
      else setError('It could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const tag = getHydrationTag(day)
  const goal = day.goal
  const percentFull = goal === null ? 0 : Math.round(Math.min(1, day.total_ml / goal.ml) * 100)

  return (
    <Sheet title="Hydration fountain" onClose={onClose}>
      <svg
        ref={svg}
        className="fountain"
        viewBox="0 -34 300 244"
        role="img"
        aria-label={`Hydration fountain, ${percentFull}% full`}
      />
      <div className="sheet-figure">
        <p className="muted">
          <strong className="sheet-number">{formatLitres(day.total_ml)}</strong>
          {goal === null ? (
            ' L today'
          ) : (
            <>
              {' '}
              of <strong>{formatLitres(goal.ml)}</strong> L today
            </>
          )}
        </p>
        <span className={`chip chip-${tag.tone}`}>{tag.label}</span>
      </div>
      <p>{describeHydration(day)}</p>
      {canLog ? (
        <div className="choices choices-four" role="group" aria-label="Log a drink">
          {DRINK_SIZES.map(({ ml, label }) => (
            <button
              key={ml}
              type="button"
              className="ghost choice"
              disabled={saving}
              onClick={() => void save(() => logDrink(crewMemberId, TODAY, ml), ml)}
            >
              {label}
              <small>{ml} ml</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="sheet-small">Only the crew member can log their own drinks.</p>
      )}
      <div className="sheet-figure">
        <p className="sheet-small">
          <strong>{day.full_days_in_a_row}</strong> {day.full_days_in_a_row === 1 ? 'day' : 'days'} in a row with a
          full fountain
        </p>
        {canLog && (
          <button
            type="button"
            className="ghost ghost-small"
            disabled={saving || day.drinks.length === 0}
            onClick={() => void save(() => undoDrink(crewMemberId, TODAY))}
          >
            Undo last drink
          </button>
        )}
      </div>
      <div>
        <p className="sheet-error" role="alert">
          {error}
        </p>
        <p className="sheet-small">{describeGoalSource(day)}</p>
      </div>
    </Sheet>
  )
}
