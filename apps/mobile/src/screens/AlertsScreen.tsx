import { useEffect, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { formatReading } from '../lib/indicators'
import type { ScreenProps } from './CrewApp'

/** The rules your latest readings break, each with what to do. Then the prototype's solar flare drill, as DEMO. */
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

      <h2 className="sec">
        Emergency drill <span className="demo">DEMO</span>
      </h2>
      <section className="card">
        <p className="note">The prototype's solar flare warning, kept as a drill. Its times and doses are made up.</p>
        <button className="primary warn" type="button" onClick={() => setDrill(true)}>
          Start the solar flare drill
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
const DRILL_SECONDS = 18 * 60 + 42

function SolarFlareDrill({ onClose }: { onClose: () => void }) {
  const [left, setLeft] = useState(DRILL_SECONDS)
  const [done, setDone] = useState<boolean[]>(DRILL_STEPS.map(() => false))
  useEffect(() => {
    const timer = window.setInterval(() => setLeft((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const next = done.indexOf(false)
  const clock = `00:${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`

  return (
    <Sheet label="Solar flare drill" onClose={onClose}>
      <span className="tag warn">Class X-2.4 solar flare · DRILL</span>
      <h2>Potential incident warning</h2>
      <p className="note">Coronal mass ejection inbound. Made-up scenario for practice.</p>
      <div className="eta">
        <span>ETA impact window</span>
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
