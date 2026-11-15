import { useEffect, useRef, useState } from 'react'
import { ApiError, NetworkError, api } from '@mooncare/api'
import type { BreathingDay } from '@mooncare/api'
import { Sheet } from '../components/Sheet'
import { createBalloon } from './balloonArt'
import type { Balloon, BalloonState } from './balloonArt'

const BREATH_CHOICES = [3, 5, 8]
const SECONDS_PER_BREATH = 10 // 4 in, 6 out

/** Becky's breathing balloon: it grows as you breathe in and shrinks as you breathe out. */
export function BreathingSheet({
  crewMemberId,
  today,
  canLog,
  onChange,
  onClose,
}: {
  crewMemberId: number
  today: string
  canLog: boolean
  onChange: (day: BreathingDay) => void
  onClose: () => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const balloon = useRef<Balloon | null>(null)
  const [breaths, setBreaths] = useState(5)
  const [state, setState] = useState<BalloonState>({ mode: 'idle', phase: 'in', breath: 1, count: 0, progress: 0 })
  const [note, setNote] = useState('')
  const logged = useRef(false)

  useEffect(() => {
    if (!svg.current) return
    balloon.current = createBalloon(svg.current, setState)
    return () => balloon.current?.destroy()
  }, [])

  // A finished session is stored once, when the balloon has floated away
  useEffect(() => {
    if (state.mode !== 'done' || logged.current || !canLog) return
    logged.current = true
    api
      .logBreathing(crewMemberId, today, breaths)
      .then((day) => {
        onChange(day)
        setNote('')
      })
      .catch((failure: unknown) =>
        setNote(
          failure instanceof NetworkError
            ? 'Done. The base server cannot be reached, so this session was not counted.'
            : failure instanceof ApiError
              ? failure.message
              : 'The session could not be saved.',
        ),
      )
  }, [state.mode, canLog, crewMemberId, today, breaths, onChange])

  function go() {
    if (state.mode === 'run') {
      balloon.current?.stop()
      return
    }
    logged.current = false
    balloon.current?.start(breaths)
  }

  const phaseText =
    state.mode === 'idle'
      ? 'Ready when you are'
      : state.mode === 'run'
        ? state.phase === 'in'
          ? 'Breathe in'
          : 'Breathe out'
        : state.mode === 'lift'
          ? 'Well done'
          : 'Session complete'
  const messageText =
    state.mode === 'idle'
      ? 'Breathe in as the balloon grows. Breathe out as it shrinks.'
      : state.mode === 'run'
        ? `Breath ${state.breath} of ${breaths}`
        : state.mode === 'lift'
          ? 'Watch it float away.'
          : `Nicely done. ${breaths} slow breaths.`

  return (
    <Sheet label="Breathing exercise" onClose={onClose}>
      <h2 className="h2i">
        <span className="pic" aria-hidden="true">
          <BalloonIcon />
        </span>
        Breathing exercise
      </h2>
      <svg
        ref={svg}
        className="balloon"
        viewBox="0 0 300 312"
        role="img"
        aria-label="A hot air balloon that grows as you breathe in and shrinks as you breathe out"
      />
      <div className="brinfo" aria-live="polite">
        <div className="brph">{phaseText}</div>
        <div className="brcnt">{state.mode === 'run' ? state.count : ''}</div>
      </div>
      <p className="brmsg">{messageText}</p>
      <div className="bar" aria-hidden="true">
        <i style={{ width: `${(state.mode === 'idle' ? 0 : state.progress * 100).toFixed(1)}%` }} />
      </div>
      <div className="hydbtns three" role="group" aria-label="Number of breaths">
        {BREATH_CHOICES.map((count) => (
          <button
            key={count}
            type="button"
            className={count === breaths ? 'u' : undefined}
            aria-pressed={count === breaths}
            disabled={state.mode !== 'idle' && state.mode !== 'done'}
            onClick={() => setBreaths(count)}
          >
            {count} breaths
            <small>{count * SECONDS_PER_BREATH} s</small>
          </button>
        ))}
      </div>
      <button className="primary" type="button" style={{ marginTop: 12 }} disabled={state.mode === 'lift'} onClick={go}>
        {state.mode === 'run' ? 'Stop' : state.mode === 'done' ? 'Go again' : 'Start'}
      </button>
      <p className="err" role="alert">
        {note}
      </p>
      <p className="note hydsrc">
        A simple slow-breathing exercise: about 4 seconds in, 6 seconds out. This is a general relaxation exercise, not
        treatment. Stop if you feel dizzy and tell the flight surgeon.
      </p>
    </Sheet>
  )
}

export function BalloonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c-3.3 0-6 2.5-6 5.6 0 2.6 2 5 4.2 6.4h3.6c2.2-1.4 4.2-3.8 4.2-6.4C18 5.5 15.3 3 12 3Z" />
      <path d="M12 3c-1.6 2-1.6 8.5 0 12M12 3c1.6 2 1.6 8.5 0 12" />
      <rect x="10" y="18" width="4" height="3" rx=".7" />
      <path d="M10.8 15 10.3 18M13.2 15l.5 3" />
    </svg>
  )
}
