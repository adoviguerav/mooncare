import { useState } from 'react'
import type { PanelIndicator } from '@mooncare/api'
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

export function VitalsScreen({ panel, onOpenIndicator }: ScreenProps) {
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
        <p className="note" style={{ marginTop: -6 }}>
          Radiation is the station's dose rate (NASA RadLab, ISS): the same reading for every crew member, not a
          personal dose.
        </p>
        <div className="grid" style={{ margin: 0 }}>
          {['spo2', 'breathing_rate', 'radiation_dose_rate'].map((id) => {
            const indicator = panel.indicators.find((candidate) => candidate.id === id)
            return indicator ? <IndicatorCard key={id} indicator={indicator} onOpen={onOpenIndicator} /> : null
          })}
        </div>
      </section>
    </main>
  )
}
