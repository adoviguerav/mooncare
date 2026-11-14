import { useState } from 'react'
import { ApiError, NetworkError, api } from '@mooncare/api'
import type { DailyChecklist } from '@mooncare/api'
import { useLoad } from '../lib/useLoad'
import type { ScreenProps } from './CrewApp'

const AUTO_NOTE: Record<string, string> = {
  auto_checkin: 'Done by your check-in',
  auto_sleep: 'Done when your tracker records the night',
}

/** Today's tasks. Some complete themselves from your data; you tick the others. Each one earns XP. */
export function ChecklistScreen({ crewMemberId, today }: ScreenProps) {
  const loaded = useLoad(() => api.checklist(crewMemberId, today), [crewMemberId, today])
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null)
  const [busyTask, setBusyTask] = useState<string | null>(null)
  const [error, setError] = useState('')
  const current = checklist ?? loaded.data

  async function toggle(taskId: string, done: boolean) {
    setBusyTask(taskId)
    setError('')
    try {
      setChecklist(await api.tickTask(crewMemberId, today, taskId, done))
    } catch (failure) {
      setError(
        failure instanceof NetworkError
          ? 'The base server cannot be reached. Try again when it answers.'
          : failure instanceof ApiError
            ? failure.message
            : 'It could not be saved.',
      )
    } finally {
      setBusyTask(null)
    }
  }

  if (!current) {
    return <p className="note">{loaded.error ? 'The checklist cannot be loaded right now.' : 'Loading…'}</p>
  }
  const done = current.tasks.filter((task) => task.done).length
  const { progress } = current

  return (
    <main>
      <h2 className="sec">Daily checklist</h2>
      <section className="card">
        <div className="row">
          <span>
            {done} of {current.tasks.length} done today
          </span>
          <span>
            Level {progress.level} · {progress.xp.toLocaleString('en')} XP
          </span>
        </div>
        <div className="bar" aria-hidden="true">
          <i style={{ width: `${(done / current.tasks.length) * 100}%` }} />
        </div>
        {current.tasks.map((task) => {
          const automatic = task.completion !== 'manual'
          return (
            <label key={task.id} className={`q${task.done ? ' done' : ''}`} style={automatic ? { cursor: 'default' } : undefined}>
              <input
                type="checkbox"
                checked={task.done}
                disabled={automatic || busyTask === task.id}
                onChange={() => void toggle(task.id, !task.done)}
              />
              <span className="t">
                {task.title}
                {automatic && (
                  <span className="note" style={{ display: 'block', margin: 0, fontSize: 12 }}>
                    {AUTO_NOTE[task.completion]}
                  </span>
                )}
              </span>
              <span className="tag mute">+{task.xp} XP</span>
            </label>
          )
        })}
        <p className="err" role="alert">
          {error}
        </p>
        <p className="note">
          XP rewards keeping the routine, never a health value. {progress.next_level_xp.toLocaleString('en')} XP make a level.
        </p>
      </section>
    </main>
  )
}
