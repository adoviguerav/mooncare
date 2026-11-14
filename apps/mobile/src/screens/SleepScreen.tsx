import { api } from '@mooncare/api'
import { Donut, HistoryChart } from '../components/Charts'
import { addDays } from '../lib/dates'
import { formatValue } from '../lib/indicators'
import { useLoad } from '../lib/useLoad'
import type { ScreenProps } from './CrewApp'
import { IndicatorCard } from './VitalsScreen'

const NIGHTS = 14

export function SleepScreen({ crewMemberId, today, panel, onOpenIndicator }: ScreenProps) {
  const find = (id: string) => panel.indicators.find((indicator) => indicator.id === id)
  const duration = find('sleep_duration')
  const efficiency = find('sleep_efficiency')
  const awake = find('sleep_awake_minutes')
  const history = useLoad(() => api.indicator(crewMemberId, 'sleep_duration', addDays(today, -NIGHTS + 1), today), [crewMemberId, today])

  const asleepMinutes = duration?.reading?.value ?? null
  const awakeMinutes = awake?.reading?.value ?? null
  const sameNight = duration?.reading && awake?.reading && duration.reading.taken_at === awake.reading.taken_at

  return (
    <main>
      <h2 className="sec">Sleep</h2>
      <div className="grid">
        {[duration, efficiency, awake].map((indicator) =>
          indicator ? <IndicatorCard key={indicator.id} indicator={indicator} onOpen={onOpenIndicator} /> : null,
        )}
      </div>

      <section className="two">
        <div className="card">
          <h2>Last night in bed</h2>
          {sameNight && asleepMinutes != null && awakeMinutes != null ? (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <Donut
                label="Time asleep and awake in bed"
                parts={[
                  { value: asleepMinutes, color: 'var(--cy)' },
                  { value: awakeMinutes, color: 'var(--warn)' },
                ]}
              />
              <ul className="legend" style={{ flex: 1, minWidth: 150 }}>
                <li>
                  <span>
                    <i className="dot" style={{ background: 'var(--cy)' }} />
                    Asleep
                  </span>
                  <b>{formatValue(asleepMinutes, 'min')}</b>
                </li>
                <li>
                  <span>
                    <i className="dot" style={{ background: 'var(--warn)' }} />
                    Awake in bed
                  </span>
                  <b>{formatValue(awakeMinutes, 'min')} min</b>
                </li>
              </ul>
            </div>
          ) : (
            <p className="note">No sleep recorded for the last night.</p>
          )}
          <p className="note">
            Sleep stages (deep, light, REM) are not shown: the dataset gives them only as a comparison with each
            volunteer's own average, not as the share of the night.
          </p>
        </div>
        <div className="card">
          <h2>Last {NIGHTS} nights</h2>
          {history.data ? (
            <HistoryChart readings={history.data.readings} rules={history.data.rules} height={160} label={`Sleep duration, last ${NIGHTS} nights`} />
          ) : (
            <p className="note">{history.error ? 'The history cannot be loaded right now.' : 'Loading…'}</p>
          )}
          <p className="note">Minutes asleep each night. The dashed line is the limit of the sleep rule.</p>
        </div>
      </section>
    </main>
  )
}
