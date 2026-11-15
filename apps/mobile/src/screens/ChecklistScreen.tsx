import { useState } from 'react'
import { ApiError, NetworkError, api } from '@mooncare/api'
import type { DailyChecklist } from '@mooncare/api'
import { useLoad } from '../lib/useLoad'
import type { ScreenProps } from './CrewApp'
import { ExerciseGuide } from '../wellbeing/ExerciseGuide'

// The task the exercise guide explains and can tick
const EXERCISE_TASK = 'exercise'

const AUTO_NOTE: Record<string, string> = {
  auto_checkin: 'Done by your check-in',
  auto_sleep: 'Done when your tracker records the night',
}

/** Today's tasks. Some complete themselves from your data; you tick the others. No points or levels (Becky, 15 Nov). */
export function ChecklistScreen({ me, crewMemberId, today }: ScreenProps) {
  const loaded = useLoad(() => api.checklist(crewMemberId, today), [crewMemberId, today])
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null)
  const [busyTask, setBusyTask] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const canTick = me.crew_member_id === crewMemberId
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
  const exerciseDone = current.tasks.find((task) => task.id === EXERCISE_TASK)?.done ?? false

  return (
    <main>
      <h2 className="sec">Daily checklist</h2>
      <section className="card">
        <div className="row">
          <span>
            {done} of {current.tasks.length} done today
          </span>
          <span>{current.progress.streak}-day check-in streak</span>
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
                disabled={automatic || !canTick || busyTask === task.id}
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
              {task.id === EXERCISE_TASK && (
                <button type="button" className="mbtn" onClick={(event) => {
                  event.preventDefault()
                  setGuideOpen(true)
                }}>
                  How to
                </button>
              )}
            </label>
          )
        })}
        <p className="err" role="alert">
          {error}
        </p>
        <p className="note">The tasks keep the routine going. None of them is a health value.</p>
      </section>
      {guideOpen && (
        <ExerciseGuide
          done={exerciseDone}
          canTick={canTick}
          onTick={() => toggle(EXERCISE_TASK, true)}
          onClose={() => setGuideOpen(false)}
        />
      )}
    </main>
  )
}
