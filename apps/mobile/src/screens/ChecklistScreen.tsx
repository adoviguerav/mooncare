import { useState } from 'react'

// The prototype's daily checklist. The backend has no tasks yet, so the list is fixed and the ticks live only on
// this device. Marked DEMO on screen.
const TASKS = [
  { id: 'checkin', text: 'Daily check-in: how you feel', xp: 50 },
  { id: 'exercise', text: 'Resistance exercise session', xp: 120 },
  { id: 'hydration', text: 'Log water and meals', xp: 40 },
  { id: 'sleep', text: 'Wind down: lights out on schedule', xp: 60 },
  { id: 'meds', text: 'Read today’s alerts and what to do', xp: 30 },
]
const STORAGE_KEY = 'mooncare.checklist'

function readTicks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

export function ChecklistScreen() {
  const [ticks, setTicks] = useState(readTicks)
  const done = TASKS.filter((task) => ticks[task.id]).length

  function toggle(id: string) {
    const next = { ...ticks, [id]: !ticks[id] }
    setTicks(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // not kept after a reload, nothing else changes
    }
  }

  return (
    <main>
      <h2 className="sec">
        Daily checklist <span className="demo">DEMO</span>
      </h2>
      <section className="card">
        <p className="note">
          {done} of {TASKS.length} done
        </p>
        <div className="bar" aria-hidden="true">
          <i style={{ width: `${(done / TASKS.length) * 100}%` }} />
        </div>
        {TASKS.map((task) => (
          <label key={task.id} className={`q${ticks[task.id] ? ' done' : ''}`}>
            <input type="checkbox" checked={!!ticks[task.id]} onChange={() => toggle(task.id)} />
            <span className="t">{task.text}</span>
            <span className="tag mute">+{task.xp} XP</span>
          </label>
        ))}
        <p className="note" style={{ marginTop: 10 }}>
          A fixed example list. Ticks stay on this device only; the backend has no tasks yet.
        </p>
      </section>
    </main>
  )
}
