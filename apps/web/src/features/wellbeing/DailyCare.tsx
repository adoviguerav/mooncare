import { useCallback, useState } from 'react'
import { EXERCISES } from '../../../../mobile/src/wellbeing/exerciseArt.ts'
import { Icon } from '../../components/Icon.tsx'
import { useApi } from '../../hooks/useApi.ts'
import { fetchBreathing, fetchChecklist, fetchHydration, tickTask } from '../../lib/api.ts'
import type { BreathingDay, DailyChecklist, HydrationDay } from '../../lib/api.ts'
import { TODAY } from '../../lib/config.ts'
import { BreathingSheet } from './BreathingSheet.tsx'
import { ExerciseGuide } from './ExerciseGuide.tsx'
import { formatLitres, getHydrationTag } from './hydration.ts'
import { HydrationSheet } from './HydrationSheet.tsx'

// The daily task the exercise guide explains and can tick
const EXERCISE_TASK_ID = 'exercise'

type OpenSheet = 'hydration' | 'breathing' | 'exercise'

/** The daily tools of the crew app on Today: the hydration fountain, the breathing balloon and the exercise guide.
 * `canLog` is true only when the signed-in user is this crew member; anyone else sees the values and cannot log. */
export function DailyCare({ crewMemberId, canLog }: { crewMemberId: number; canLog: boolean }) {
  // An older server without these tools answers with an error: its tile is not shown
  const { data: loadedHydration } = useApi(() => fetchHydration(crewMemberId, TODAY))
  const { data: loadedBreathing } = useApi(() => fetchBreathing(crewMemberId, TODAY))
  // Only whoever can tick the exercise task needs to know whether it is done
  const { data: loadedChecklist } = useApi<DailyChecklist | null>(() =>
    canLog ? fetchChecklist(crewMemberId, TODAY) : Promise.resolve(null),
  )
  const [savedHydration, setSavedHydration] = useState<HydrationDay | null>(null)
  const [savedBreathing, setSavedBreathing] = useState<BreathingDay | null>(null)
  const [savedChecklist, setSavedChecklist] = useState<DailyChecklist | null>(null)
  const [openSheet, setOpenSheet] = useState<OpenSheet | null>(null)
  const close = useCallback(() => setOpenSheet(null), [])

  const hydration = savedHydration ?? loadedHydration
  const breathing = savedBreathing ?? loadedBreathing
  const exerciseTask = (savedChecklist ?? loadedChecklist)?.tasks.find((task) => task.id === EXERCISE_TASK_ID)

  return (
    <section>
      <h2 className="section-title">Daily care</h2>
      <div className="tiles tiles-vitals">
        {hydration !== null && <HydrationTile day={hydration} onOpen={() => setOpenSheet('hydration')} />}
        {breathing !== null && (
          <button className="tile" onClick={() => setOpenSheet('breathing')}>
            <span className="tile-head">
              <span className="tile-icon">
                <Icon name="wind" size={16} />
              </span>
              <span className="tile-name">Breathing</span>
            </span>
            <span className="tile-value">
              {breathing.sessions}
              <span className="tile-unit"> {breathing.sessions === 1 ? 'session' : 'sessions'} today</span>
            </span>
            <span className="chip chip-ok">{breathing.sessions > 0 ? 'Done today' : 'Ready'}</span>
            <span className="tile-age">Tap to start. About 1 minute.</span>
          </button>
        )}
        <button className="tile" onClick={() => setOpenSheet('exercise')}>
          <span className="tile-head">
            <span className="tile-icon">
              <Icon name="bolt" size={16} />
            </span>
            <span className="tile-name">Exercise guide</span>
          </span>
          <span>{EXERCISES.map((exercise) => exercise.short).join(', ')}</span>
          <span className="tile-age">Pick a move and watch it.</span>
        </button>
      </div>
      {openSheet === 'hydration' && hydration !== null && (
        <HydrationSheet
          crewMemberId={crewMemberId}
          initialDay={hydration}
          canLog={canLog}
          onChange={setSavedHydration}
          onClose={close}
        />
      )}
      {openSheet === 'breathing' && (
        <BreathingSheet crewMemberId={crewMemberId} canLog={canLog} onChange={setSavedBreathing} onClose={close} />
      )}
      {openSheet === 'exercise' && (
        <ExerciseGuide
          done={exerciseTask?.done ?? false}
          canTick={canLog && exerciseTask !== undefined}
          onTick={async () => setSavedChecklist(await tickTask(crewMemberId, TODAY, EXERCISE_TASK_ID))}
          onClose={close}
        />
      )}
    </section>
  )
}

function HydrationTile({ day, onOpen }: { day: HydrationDay; onOpen: () => void }) {
  const tag = getHydrationTag(day)
  const goalMl = day.goal?.ml ?? 0
  const shareOfGoal = goalMl > 0 ? Math.min(1, day.total_ml / goalMl) : 0

  return (
    <button className="tile" onClick={onOpen}>
      <span className="tile-head">
        <span className="tile-icon">
          <Icon name="drop" size={16} />
        </span>
        <span className="tile-name">Hydration</span>
      </span>
      <span className="tile-value">
        {formatLitres(day.total_ml)}
        <span className="tile-unit"> {goalMl > 0 ? `of ${formatLitres(goalMl)} L` : 'L'}</span>
      </span>
      <span className={`chip chip-${tag.tone}`}>{tag.label}</span>
      <span className="care-meter" aria-hidden="true">
        <span style={{ transform: `scaleX(${shareOfGoal})` }} />
      </span>
    </button>
  )
}
