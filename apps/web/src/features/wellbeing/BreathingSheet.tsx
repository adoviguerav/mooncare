import { useEffect, useRef, useState } from 'react'
import { createBalloon } from '../../../../mobile/src/wellbeing/balloonArt.ts'
import type { Balloon, BalloonState } from '../../../../mobile/src/wellbeing/balloonArt.ts'
import { ApiError, logBreathing } from '../../lib/api.ts'
import type { BreathingDay } from '../../lib/api.ts'
import { TODAY } from '../../lib/config.ts'
import { Sheet } from './Sheet.tsx'

const BREATH_CHOICES = [3, 5, 8]
const DEFAULT_BREATHS = 5
// 4 in, 6 out
const SECONDS_PER_BREATH = 10
const IDLE: BalloonState = { mode: 'idle', phase: 'in', breath: 1, count: 0, progress: 0 }

type Props = {
  crewMemberId: number
  canLog: boolean
  onChange: (day: BreathingDay) => void
  onClose: () => void
}

/** The breathing balloon: it grows as you breathe in and shrinks as you breathe out. */
export function BreathingSheet({ crewMemberId, canLog, onChange, onClose }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const balloon = useRef<Balloon | null>(null)
  const [breaths, setBreaths] = useState(DEFAULT_BREATHS)
  const [state, setState] = useState(IDLE)
  const [error, setError] = useState('')
  const isLogged = useRef(false)

  useEffect(() => {
    if (svg.current === null) return
    balloon.current = createBalloon(svg.current, setState)
    return () => balloon.current?.destroy()
  }, [])

  // A finished session is stored once, when the balloon has floated away
  useEffect(() => {
    if (state.mode !== 'done' || isLogged.current || !canLog) return
    isLogged.current = true
    logBreathing(crewMemberId, TODAY, breaths)
      .then((day) => {
        onChange(day)
        setError('')
      })
      .catch((failure: unknown) => {
        if (failure instanceof ApiError) setError(failure.message)
        // fetch rejects with a TypeError when the request never reaches the server
        else if (failure instanceof TypeError) {
          setError('Done. The base server cannot be reached, so this session was not counted.')
        } else setError('The session could not be saved.')
      })
  }, [state.mode, canLog, crewMemberId, breaths, onChange])

  function startOrStop() {
    if (state.mode === 'run') {
      balloon.current?.stop()
      return
    }
    isLogged.current = false
    balloon.current?.start(breaths)
  }

  const canChoose = state.mode === 'idle' || state.mode === 'done'

  return (
    <Sheet title="Breathing exercise" onClose={onClose}>
      <svg
        ref={svg}
        className="balloon"
        viewBox="0 0 300 312"
        role="img"
        aria-label="A hot air balloon that grows as you breathe in and shrinks as you breathe out"
      />
      <div className="breath">
        <p className="breath-phase">
          <span aria-live="polite">{getPhaseText(state)}</span>
          {state.mode === 'run' && <span className="breath-count"> {state.count}</span>}
        </p>
        <p className="muted">{getMessageText(state, breaths)}</p>
      </div>
      <div className="care-meter" aria-hidden="true">
        <span style={{ transform: `scaleX(${state.mode === 'idle' ? 0 : state.progress})` }} />
      </div>
      <div className="choices" role="group" aria-label="Number of breaths">
        {BREATH_CHOICES.map((count) => (
          <button
            key={count}
            type="button"
            className="ghost choice"
            aria-pressed={count === breaths}
            disabled={!canChoose}
            onClick={() => setBreaths(count)}
          >
            {count} breaths
            <small>{count * SECONDS_PER_BREATH} s</small>
          </button>
        ))}
      </div>
      <button type="button" className="primary" disabled={state.mode === 'lift'} onClick={startOrStop}>
        {state.mode === 'run' ? 'Stop' : state.mode === 'done' ? 'Go again' : 'Start'}
      </button>
      <div>
        <p className="sheet-error" role="alert">
          {error}
        </p>
        <p className="sheet-small">
          A simple slow-breathing exercise: about 4 seconds in, 6 seconds out. This is a general relaxation exercise,
          not treatment. Stop if you feel dizzy and tell the flight surgeon.
        </p>
      </div>
    </Sheet>
  )
}

function getPhaseText(state: BalloonState): string {
  if (state.mode === 'idle') return 'Ready when you are'
  if (state.mode === 'run') return state.phase === 'in' ? 'Breathe in' : 'Breathe out'
  return state.mode === 'lift' ? 'Well done' : 'Session complete'
}

function getMessageText(state: BalloonState, breaths: number): string {
  if (state.mode === 'idle') return 'Breathe in as the balloon grows. Breathe out as it shrinks.'
  if (state.mode === 'run') return `Breath ${state.breath} of ${breaths}`
  return state.mode === 'lift' ? 'Watch it float away.' : `Nicely done. ${breaths} slow breaths.`
}
