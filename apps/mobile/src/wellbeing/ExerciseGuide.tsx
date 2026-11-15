import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { CYCLE_SECONDS, EXERCISES, REPS, buildStage, depthAt, drawFrame } from './exerciseArt'

const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const STAGE_NAMES = ['', 'Hold', '', 'Breathe']
const MUSCLES_ON_DEPTH = 0.55
const SCRUB_STEPS = 1000

/** Becky's exercise guide: an animated figure per move, the muscles that work, steps, a common mistake and why. */
export function ExerciseGuide({
  done,
  canTick,
  onTick,
  onClose,
}: {
  done: boolean
  canTick: boolean
  onTick: () => Promise<void>
  onClose: () => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(!RM)
  const [seconds, setSeconds] = useState(RM ? CYCLE_SECONDS * 0.47 : 0)
  const [busy, setBusy] = useState(false)
  const built = useRef(false)

  useEffect(() => {
    if (svg.current && !built.current) {
      buildStage(svg.current)
      built.current = true
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = 0
    const loop = (now: number) => {
      const step = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      setSeconds((current) => current + step)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const exercise = EXERCISES[index]
  const cycle = (seconds % CYCLE_SECONDS) / CYCLE_SECONDS
  const [depth, stage] = depthAt(cycle)
  useEffect(() => {
    if (svg.current && built.current) drawFrame(svg.current, index, seconds)
  }, [index, seconds])

  const stageName = stage === 0 ? exercise.go : stage === 2 ? exercise.back : STAGE_NAMES[stage]
  const choose = (next: number) => {
    setIndex(next)
    setSeconds(RM ? CYCLE_SECONDS * 0.47 : 0)
  }

  async function tick() {
    setBusy(true)
    try {
      await onTick()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet label="Exercise guide" onClose={onClose}>
      <h2 className="h2i">Exercise guide</h2>
      <p className="note" style={{ margin: '0 0 8px' }}>
        Pick a move and watch it. Same slow tempo for each: about 2 seconds down, 2 seconds up.
      </p>
      <div className="extabs" role="group" aria-label="Choose an exercise">
        {EXERCISES.map((candidate, position) => (
          <button key={candidate.short} type="button" aria-pressed={position === index} onClick={() => choose(position)}>
            {candidate.short}
          </button>
        ))}
      </div>
      <div className="exstage">
        <svg ref={svg} viewBox="0 0 340 236" role="img" aria-label={`Animated demonstration of the ${exercise.name.toLowerCase()}`} />
        <span className={`exph${stage === 1 ? ' h' : stage === 2 ? ' u' : ''}`}>{stageName}</span>
        <span className="exrep">
          Rep {(Math.floor(seconds / CYCLE_SECONDS) % REPS) + 1} of {REPS}
        </span>
        <div className="excon">
          <button type="button" onClick={() => setPlaying(!playing)}>
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
              setSeconds(Math.floor(seconds / CYCLE_SECONDS) * CYCLE_SECONDS + (Number(event.target.value) / SCRUB_STEPS) * CYCLE_SECONDS)
            }}
          />
        </div>
      </div>
      <div className="exef">
        <div className="exeft">
          <span>Muscles working (shown in red)</span>
          <span>{Math.round(depth * 100)}%</span>
        </div>
        <div className="bar warn" aria-hidden="true">
          <i className="exbar" style={{ width: `${(depth * 100).toFixed(0)}%` }} />
        </div>
        <div className="exchips">
          {exercise.muscles.map((muscle) => (
            <span key={muscle} className={depth > MUSCLES_ON_DEPTH ? 'on' : undefined}>
              {muscle}
            </span>
          ))}
        </div>
      </div>
      <h3 className="sec" style={{ marginTop: 16 }}>
        {exercise.name}
      </h3>
      <p className="note" style={{ margin: '-4px 0 8px' }}>
        {exercise.sets} · your programme sets the load
      </p>
      <ol className="exsteps">
        {exercise.steps.map((step) => (
          <li key={step}>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="callbox">
        <b>Common mistake</b>
        <br />
        {exercise.mistake}
      </p>
      <h3 className="sec">Why it matters on the Moon</h3>
      <p style={{ margin: 0 }}>{exercise.why}</p>
      {canTick && (
        <button className="primary" type="button" style={{ marginTop: 14 }} disabled={done || busy} onClick={() => void tick()}>
          {done ? 'Session already ticked' : 'Mark my resistance session as done'}
        </button>
      )}
      <p className="note" style={{ marginTop: 10 }}>
        General technique guidance. Your programme sets the load, sets and reps. Confirm with the flight surgeon or
        trainer. Stop if you feel sharp pain or dizziness.
      </p>
    </Sheet>
  )
}
