import { useCallback, useState } from 'react'
import { api } from '@mooncare/api'
import type { BreathingDay, HydrationDay } from '@mooncare/api'
import { useLoad } from '../lib/useLoad'
import { BalloonIcon, BreathingSheet } from './BreathingSheet'
import { DropIcon, HydrationSheet, hydrationTag } from './HydrationSheet'

/** The two daily tools of Becky's prototype on Today: the hydration fountain and the breathing balloon. */
export function DailyCare({ crewMemberId, today, canLog }: { crewMemberId: number; today: string; canLog: boolean }) {
  const hydration = useLoad(() => api.hydration(crewMemberId, today), [crewMemberId, today])
  const breathing = useLoad(() => api.breathing(crewMemberId, today), [crewMemberId, today])
  const [water, setWater] = useState<HydrationDay | null>(null)
  const [breaths, setBreaths] = useState<BreathingDay | null>(null)
  const [open, setOpen] = useState<'hydration' | 'breathing' | null>(null)
  const close = useCallback(() => setOpen(null), [])

  const day = water ?? hydration.data
  const sessions = (breaths ?? breathing.data)?.sessions ?? 0
  if (hydration.error && breathing.error) return null // an older server without these tools: show nothing

  const [tone, tag] = day ? hydrationTag(day) : ['ok', '…']
  const goal = day?.goal?.ml ?? 0
  return (
    <>
      <h2 className="sec">Daily care</h2>
      <div className="grid care">
        {day && (
          <button type="button" className="card m hydt" onClick={() => setOpen('hydration')} aria-label="Open the hydration fountain">
            <div className="top">
              <span className="pic">
                <DropIcon />
              </span>
              <span className="pn">Hydration</span>
              <span className={`tag ${tone}`}>{tag}</span>
            </div>
            <div className="val">
              {(day.total_ml / 1000).toFixed(1)} <small>{goal ? `of ${(goal / 1000).toFixed(1)} L` : 'L'}</small>
            </div>
            <div className="hydmini" aria-hidden="true">
              <i style={{ width: `${goal ? Math.min(100, (day.total_ml / goal) * 100).toFixed(0) : 0}%` }} />
            </div>
          </button>
        )}
        {(breaths ?? breathing.data) && (
          <button type="button" className="card m brt" onClick={() => setOpen('breathing')} aria-label="Open the breathing exercise">
            <div className="top">
              <span className="pic">
                <BalloonIcon />
              </span>
              <span className="pn">Breathing</span>
              <span className="tag ok">{sessions ? 'Done today' : 'Ready'}</span>
            </div>
            <div className="val">
              {sessions} <small>{sessions === 1 ? 'session' : 'sessions'} today</small>
            </div>
            <p className="note" style={{ margin: '8px 0 0' }}>
              Tap to start. About 1 minute.
            </p>
          </button>
        )}
      </div>
      {open === 'hydration' && day && (
        <HydrationSheet crewMemberId={crewMemberId} today={today} initial={day} canLog={canLog} onChange={setWater} onClose={close} />
      )}
      {open === 'breathing' && <BreathingSheet crewMemberId={crewMemberId} today={today} canLog={canLog} onChange={setBreaths} onClose={close} />}
    </>
  )
}
