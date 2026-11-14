import { useEffect, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { formatReading } from '../lib/indicators'
import type { ScreenProps } from './CrewApp'

/** The rules your latest readings break, each with what to do. Then a shelter drill to practise. */
export function AlertsScreen({ panel, onOpenIndicator }: ScreenProps) {
  const alerts = panel.indicators.filter((indicator) => indicator.broken_rule)
  const [drill, setDrill] = useState(false)

  return (
    <main>
      <h2 className="sec">Alerts</h2>
      {alerts.length === 0 ? (
        <section className="card next ok" style={{ marginBottom: 16 }}>
          <h3>No alerts today</h3>
          <p className="note">Every parameter with a rule is inside its limits.</p>
        </section>
      ) : (
        alerts.map((indicator) => (
          <section key={indicator.id} className="card alertcard">
            <span className="tag warn">{indicator.name}</span>
            <h3>{indicator.broken_rule!.title}</h3>
            <p className="note">
              Latest reading: <b style={{ color: 'var(--ink)' }}>{formatReading(indicator)}</b>
              {indicator.reading && ` on ${indicator.reading.taken_at.slice(0, 10)}`}
            </p>
            <p>{indicator.broken_rule!.explanation}</p>
            <div className="next">
              <span className="note">What to do</span>
              <p style={{ margin: '4px 0 0', fontWeight: 700 }}>{indicator.broken_rule!.action}</p>
            </div>
            <button className="linkbtn" type="button" onClick={() => onOpenIndicator(indicator.id)}>
              History, rule and source
            </button>
          </section>
        ))
      )}
      <p className="note">
        An alert means a reading is outside a rule's limits. It is a prompt to act or to ask, not a diagnosis.
      </p>

      <h2 className="sec">Practice</h2>
      <section className="card">
        <h3>Solar storm shelter drill</h3>
        <p className="note">
          Rehearse getting the whole crew into the storm shelter. It times how long it takes; it does not warn of a
          real storm. Space weather warnings come from Earth.
        </p>
        <button className="primary warn" type="button" onClick={() => setDrill(true)}>
          Start the drill
        </button>
      </section>
      {drill && <SolarFlareDrill onClose={() => setDrill(false)} />}
    </main>
  )
}

const DRILL_STEPS = [
  { title: 'Stop what you are doing', detail: 'Secure tools and end any outside activity.' },
  { title: 'Go to the storm shelter', detail: 'The most shielded module of the base.' },
  { title: 'Take your dosimeter', detail: 'Wear it the whole time in the shelter.' },
  { title: 'Check in with the crew', detail: 'Confirm everyone is in the shelter.' },
  { title: 'Stay until the all-clear', detail: 'The commander gives it when the dose rate is back to normal.' },
]
/** A practice run: a stopwatch from the start until every step is ticked. No made-up storm, flux or dose. */
function SolarFlareDrill({ onClose }: { onClose: () => void }) {
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState<boolean[]>(DRILL_STEPS.map(() => false))
  const next = done.indexOf(false)
  useEffect(() => {
    if (next === -1) return // every step done: the stopwatch stops
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [next])
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <Sheet label="Solar storm shelter drill" onClose={onClose}>
      <span className="tag warn">Practice drill</span>
      <h2>Solar storm shelter drill</h2>
      <p className="note">Tick each step as you do it. The time is how long the crew takes to be safe.</p>
      <div className="eta">
        <span>{next === -1 ? 'Done in' : 'Time since the start'}</span>
        <b role="timer">{clock}</b>
      </div>
      <div className={`next${next === -1 ? ' ok' : ''}`}>
        <span className="note">{next === -1 ? 'All steps done' : `Step ${next + 1} of ${DRILL_STEPS.length}`}</span>
        <h3>{next === -1 ? 'You are in the shelter' : DRILL_STEPS[next].title}</h3>
        <p>{next === -1 ? 'Stay until the all-clear.' : DRILL_STEPS[next].detail}</p>
      </div>
      <div className="steps" style={{ marginTop: 12 }}>
        {DRILL_STEPS.map((step, index) => (
          <label key={step.title} className={done[index] ? 'done' : undefined}>
            <input
              type="checkbox"
              checked={done[index]}
              onChange={() => setDone((current) => current.map((value, position) => (position === index ? !value : value)))}
            />
            <span>
              <b>{step.title}</b>
              <span className="note">{step.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </Sheet>
  )
}
