import { useEffect, useRef, useState } from 'react'
import {
  CYCLE_SECONDS,
  EXERCISES,
  REPS,
  buildStage,
  depthAt,
  drawFrame,
} from '../../../../mobile/src/wellbeing/exerciseArt.ts'
import { ApiError } from '../../lib/api.ts'
import { Sheet } from './Sheet.tsx'

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Without motion the figure rests near the bottom of the move, where the working muscles show
const STILL_SECONDS = CYCLE_SECONDS * 0.47
const START_SECONDS = REDUCED_MOTION ? STILL_SECONDS : 0
const MAX_FRAME_SECONDS = 0.1
const MS_PER_SECOND = 1000
const STAGE_GOING = 0
const STAGE_HOLD = 1
const STAGE_BACK = 2
const MUSCLES_ON_DEPTH = 0.55
const SCRUB_STEPS = 1000

type Props = {
  done: boolean
  canTick: boolean
  onTick: () => Promise<void>
  onClose: () => void
}

/** The exercise guide: an animated figure per move, the muscles that work, steps, a common mistake and why. */
export function ExerciseGuide({ done, canTick, onTick, onClose }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(!REDUCED_MOTION)
  const [seconds, setSeconds] = useState(START_SECONDS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isBuilt = useRef(false)

  useEffect(() => {
    if (svg.current !== null && !isBuilt.current) {
      buildStage(svg.current)
      isBuilt.current = true
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let lastFrameAt = 0
    const advance = (now: number) => {
      const elapsed = lastFrameAt === 0 ? 0 : Math.min(MAX_FRAME_SECONDS, (now - lastFrameAt) / MS_PER_SECOND)
      lastFrameAt = now
      setSeconds((current) => current + elapsed)
      frame = requestAnimationFrame(advance)
    }
    frame = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  useEffect(() => {
    if (svg.current !== null && isBuilt.current) drawFrame(svg.current, index, seconds)
  }, [index, seconds])

  const exercise = EXERCISES[index]
  const cycle = (seconds % CYCLE_SECONDS) / CYCLE_SECONDS
  const repStartSeconds = Math.floor(seconds / CYCLE_SECONDS) * CYCLE_SECONDS
  const [depth, stage] = depthAt(cycle)
  const stageName =
    stage === STAGE_GOING ? exercise.go : stage === STAGE_BACK ? exercise.back : stage === STAGE_HOLD ? 'Hold' : 'Breathe'

  function choose(nextIndex: number) {
    setIndex(nextIndex)
    setSeconds(START_SECONDS)
  }

  async function tick() {
    setSaving(true)
    setError('')
    try {
      await onTick()
    } catch (failure) {
      if (failure instanceof ApiError) setError(failure.message)
      // fetch rejects with a TypeError when the request never reaches the server
      else if (failure instanceof TypeError) setError('The base server cannot be reached. Try again when it answers.')
      else setError('It could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title="Exercise guide" onClose={onClose}>
      <p className="muted">Pick a move and watch it. Same slow tempo for each: about 2 seconds down, 2 seconds up.</p>
      <div className="exercise-moves" role="group" aria-label="Choose an exercise">
        {EXERCISES.map((candidate, position) => (
          <button
            key={candidate.short}
            type="button"
            className="ghost ghost-small"
            aria-pressed={position === index}
            onClick={() => choose(position)}
          >
            {candidate.short}
          </button>
        ))}
      </div>
      <svg
        ref={svg}
        className="exercise-stage"
        viewBox="0 0 340 236"
        role="img"
        aria-label={`Animated demonstration of the ${exercise.name.toLowerCase()}`}
      />
      <div className="sheet-figure">
        <span className="chip chip-due">{stageName}</span>
        <span className="sheet-small exercise-count">
          Rep {(Math.floor(seconds / CYCLE_SECONDS) % REPS) + 1} of {REPS}
        </span>
      </div>
      <div className="exercise-controls">
        <button type="button" className="ghost ghost-small" onClick={() => setPlaying(!playing)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={SCRUB_STEPS}
          value={Math.round(cycle * SCRUB_STEPS)}
          aria-label="Scrub through the movement"
          onChange={(event) => {
            setPlaying(false)
            setSeconds(repStartSeconds + (Number(event.target.value) / SCRUB_STEPS) * CYCLE_SECONDS)
          }}
        />
      </div>
      <div className="exercise-effort">
        <div className="sheet-figure sheet-small">
          <span>Muscles working (shown in red)</span>
          <span className="exercise-count">{Math.round(depth * 100)}%</span>
        </div>
        <div className="care-meter" aria-hidden="true">
          <span style={{ transform: `scaleX(${depth})` }} />
        </div>
        <div className="exercise-muscles">
          {exercise.muscles.map((muscle) => (
            <span key={muscle} className={depth > MUSCLES_ON_DEPTH ? 'chip chip-alert' : 'chip chip-quiet'}>
              {muscle}
            </span>
          ))}
        </div>
      </div>
      <div>
        <h3>{exercise.name}</h3>
        <p className="sheet-small">{exercise.sets} · your programme sets the load</p>
      </div>
      <ol className="exercise-steps">
        {exercise.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div>
        <h3>Common mistake</h3>
        <p>{exercise.mistake}</p>
      </div>
      <div>
        <h3>Why it matters on the Moon</h3>
        <p>{exercise.why}</p>
      </div>
      {canTick && (
        <button type="button" className="primary" disabled={done || saving} onClick={() => void tick()}>
          {done ? 'Session already ticked' : 'Mark my resistance session as done'}
        </button>
      )}
      <div>
        <p className="sheet-error" role="alert">
          {error}
        </p>
        <p className="sheet-small">
          General technique guidance. Your programme sets the load, sets and reps. Confirm with the flight surgeon or
          trainer. Stop if you feel sharp pain or dizziness.
        </p>
      </div>
    </Sheet>
  )
}
