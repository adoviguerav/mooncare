import type { IconName } from '../components/Icon.tsx'
import type { PanelIndicator } from './api.ts'
import { GROUPS, MOOD_DAY_COUNT_IDS } from './groups.ts'

export type BodySystemId = 'brain' | 'heart' | 'immune' | 'radiation' | 'metabolism' | 'bones'

export type BodySystem = {
  id: BodySystemId
  title: string
  icon: IconName
  // Where it sits on the body map (a drawing of 360 by 400): the side and height of its label, and its dot
  side: 'left' | 'right'
  labelY: number
  dot: [number, number]
  indicatorIds: string[]
}

const getIdsOf = (...groupTitles: string[]): string[] =>
  groupTitles.flatMap((title) => GROUPS.find((group) => group.title === title)?.indicatorIds ?? [])

// Which groups of the Data tab are read together as one body system. A way to show them, not medical advice.
// The positions are the ones of the body map of the design prototype (apps/landing/index.html).
export const BODY_SYSTEMS: BodySystem[] = [
  {
    id: 'brain',
    title: 'Brain and mind',
    icon: 'brain',
    side: 'left',
    labelY: 46,
    dot: [180, 44],
    indicatorIds: [...getIdsOf('Mind', 'Sleep'), ...MOOD_DAY_COUNT_IDS],
  },
  {
    id: 'heart',
    title: 'Heart and lungs',
    icon: 'heart',
    side: 'left',
    labelY: 128,
    dot: [190, 122],
    indicatorIds: getIdsOf('Heart', 'Breathing'),
  },
  {
    id: 'immune',
    title: 'Immune system',
    icon: 'shield',
    side: 'left',
    labelY: 190,
    dot: [162, 150],
    indicatorIds: getIdsOf('Blood cells', 'Inflammation', 'Temperature'),
  },
  {
    id: 'radiation',
    title: 'Radiation',
    icon: 'radiation',
    side: 'right',
    labelY: 50,
    dot: [210, 98],
    indicatorIds: getIdsOf('Ship'),
  },
  {
    id: 'metabolism',
    title: 'Metabolism',
    icon: 'drop',
    side: 'right',
    labelY: 185,
    dot: [196, 172],
    indicatorIds: getIdsOf('Blood chemistry'),
  },
  {
    id: 'bones',
    title: 'Bones and muscle',
    icon: 'bolt',
    side: 'right',
    labelY: 295,
    dot: [194, 290],
    indicatorIds: getIdsOf('Activity'),
  },
]

// Where a parameter that no group knows yet is shown, so that none is left out of the map
const UNGROUPED_SYSTEM_ID: BodySystemId = 'metabolism'

export type BodySystemState = {
  system: BodySystem
  indicators: PanelIndicator[]
  alertCount: number
  // null: this crew member has no reading for any parameter of the system
  status: 'ok' | 'alert' | null
}

/** The state of each body system from the panel: it needs a look when a parameter with a reading breaks a rule. */
export function getBodySystemStates(indicators: PanelIndicator[]): BodySystemState[] {
  const groupedIds = BODY_SYSTEMS.flatMap((system) => system.indicatorIds)
  const ungrouped = indicators.filter((indicator) => !groupedIds.includes(indicator.id))

  return BODY_SYSTEMS.map((system) => {
    const ownIndicators = [
      // In the order of the system, not of the API
      ...system.indicatorIds.flatMap((id) => indicators.filter((indicator) => indicator.id === id)),
      ...(system.id === UNGROUPED_SYSTEM_ID ? ungrouped : []),
    ]
    const withReading = ownIndicators.filter((indicator) => indicator.reading !== null)
    const alertCount = withReading.filter((indicator) => indicator.broken_rule !== null).length
    const status = withReading.length === 0 ? null : alertCount > 0 ? 'alert' : 'ok'
    return { system, indicators: ownIndicators, alertCount, status }
  })
}
