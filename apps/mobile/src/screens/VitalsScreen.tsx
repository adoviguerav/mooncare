import { useState } from 'react'
import { api } from '@mooncare/api'
import type { PanelIndicator } from '@mooncare/api'
import { HistoryChart } from '../components/Charts'
import { useLoad } from '../lib/useLoad'
import { formatShortDay } from '../lib/dates'
import { MODULES, MODULE_NAMES, type Module, formatValue, moduleOf, shownUnit, vitalCards } from '../lib/indicators'
import type { ScreenProps } from './CrewApp'

/** One indicator: latest value, alert tag, and a tap to open its history. */
export function IndicatorCard({ indicator, onOpen }: { indicator: PanelIndicator; onOpen: (indicatorId: string) => void }) {
  const { reading, broken_rule: rule } = indicator
  return (
    <button type="button" className={`card m${rule ? ' alert' : ''}`} onClick={() => onOpen(indicator.id)}>
      <div className="top">
        <span>
          {moduleOf(indicator.id)} · {indicator.name}
        </span>
        {rule ? <span className="tag warn">Alert</span> : reading ? <span className="tag ok">OK</span> : <span className="tag mute">No data</span>}
      </div>
      <div className="val">
        {reading ? formatValue(reading.value, indicator.unit) : '—'}
        {reading && <small> {shownUnit(reading.value, indicator.unit)}</small>}
      </div>
      <p className="note">
        {rule ? rule.title : reading ? `Last reading ${formatShortDay(reading.taken_at)}` : 'No reading up to this day'}
      </p>
    </button>
  )
}

export function VitalsScreen({ today, panel, onOpenIndicator }: ScreenProps) {
  const [module, setModule] = useState<Module | 'ALL'>('ALL')
  const cards = vitalCards(panel.indicators)
  const present = MODULES.filter((candidate) => cards.some((indicator) => moduleOf(indicator.id) === candidate))
  const shown = cards.filter((indicator) => module === 'ALL' || moduleOf(indicator.id) === module)
  const sorted = [...shown.filter((indicator) => indicator.broken_rule), ...shown.filter((indicator) => !indicator.broken_rule)]

  return (
    <main>
      <h2 className="sec">Vitals</h2>
      <div className="chips" role="group" aria-label="Filter by body system">
        <button type="button" aria-pressed={module === 'ALL'} onClick={() => setModule('ALL')}>
          All
        </button>
        {present.map((candidate) => (
          <button key={candidate} type="button" aria-pressed={module === candidate} title={MODULE_NAMES[candidate]} onClick={() => setModule(candidate)}>
            {candidate}
          </button>
        ))}
      </div>
      <div className="grid">
        {sorted.map((indicator) => (
          <IndicatorCard key={indicator.id} indicator={indicator} onOpen={onOpenIndicator} />
        ))}
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Life support</h2>
        <div className="grid" style={{ margin: 0 }}>
          {['spo2', 'breathing_rate'].map((id) => {
            const indicator = panel.indicators.find((candidate) => candidate.id === id)
            return indicator ? <IndicatorCard key={id} indicator={indicator} onOpen={onOpenIndicator} /> : null
          })}
          <RadiationCard today={today} />
        </div>
      </section>
    </main>
  )
}

const RADIATION_DAYS = 30

/** The absorbed dose the base's dosimeters measured today, per instrument. It is the dose where each instrument
 *  sits, not your personal dose, and instruments of different design are never added together. */
function RadiationCard({ today }: { today: string }) {
  const radiation = useLoad(() => api.stationRadiation(today, RADIATION_DAYS), [today])
  const data = radiation.data
  const shown = data?.today[0]?.instrument ?? data?.history.at(-1)?.instrument
  const history = (data?.history ?? [])
    .filter((dose) => dose.instrument === shown)
    .map((dose) => ({ taken_at: `${dose.day}T00:00`, value: dose.absorbed_dose_ugy, broken_rule_id: null }))

  return (
    <div className="card m" style={{ cursor: 'default', gridColumn: '1 / -1' }}>
      <div className="top">
        <span>VITAL · Station radiation today</span>
        <span className="tag mute">Station, not personal</span>
      </div>
      {radiation.error && <p className="note">The radiation data cannot be loaded right now.</p>}
      {data && data.today.length === 0 && <p className="note">No dosimeter has enough readings for this day (at least 12 of its hours).</p>}
      {data && data.today.length > 0 && (
        <div className="stats">
          {data.today.map((dose) => (
            <div key={dose.instrument}>
              <span>
                {dose.instrument} · {dose.module}
              </span>
              <b>{Math.round(dose.absorbed_dose_ugy)} µGy</b>
              <span>
                {dose.mean_rate_ugy_h.toFixed(1)} µGy/h over {dose.hours_measured} h
              </span>
            </div>
          ))}
        </div>
      )}
      {history.length > 1 && (
        <HistoryChart readings={history} height={140} label={`${shown} absorbed dose per day, last ${RADIATION_DAYS} days`} />
      )}
      {data && (
        <p className="note">
          Absorbed dose per day ({shown} in the chart, last {RADIATION_DAYS} days), from the ISS's Columbus module as
          a stand-in for the base's dosimeters. Each instrument has its own design, so their values are not added
          together. No limit is set yet: a limit needs its source first.{' '}
          <a href={data.source.url} target="_blank" rel="noreferrer">
            {data.source.name}
          </a>
        </p>
      )}
    </div>
  )
}
