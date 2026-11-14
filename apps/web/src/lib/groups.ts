import type { IconName } from '../components/Icon.tsx'

export const MOOD_PREFIX = 'mood_'
// The mood rule arrives as two more indicators: on how many of the last 14 days the mood was chosen
export const MOOD_DAY_COUNT_IDS = ['mood_sad_days_14', 'mood_tense_days_14']

// The check-in shows the moods from the brightest to the lowest, not in the order of the API
export const MOOD_ORDER = ['mood_happy', 'mood_rested', 'mood_alert', 'mood_neutral', 'mood_tired', 'mood_tense', 'mood_sad']

const NASA_ASTRONAUTS = 'NASA, Inspiration4 astronauts'
const EARTH_WEARABLE = 'LifeSnaps, wearable on Earth'

export type Group = { title: string; icon: IconName; origin: string; indicatorIds: string[] }

// Which indicators are shown together, and where their data comes from.
// shortcut: the groups and their origin live here; move them to the indicator table when the API returns them
export const GROUPS: Group[] = [
  {
    title: 'Blood chemistry',
    icon: 'drop',
    origin: NASA_ASTRONAUTS,
    indicatorIds: ['glucose', 'sodium', 'potassium', 'chloride', 'creatinine', 'urea_nitrogen', 'egfr', 'albumin', 'calcium'],
  },
  {
    title: 'Blood cells',
    icon: 'flask',
    origin: NASA_ASTRONAUTS,
    indicatorIds: ['white_blood_cells', 'lymphocytes', 'hemoglobin'],
  },
  {
    title: 'Inflammation',
    icon: 'shield',
    origin: NASA_ASTRONAUTS,
    indicatorIds: ['il_6', 'tnf_alpha', 'il_1_beta', 'ifn_gamma', 'crp', 'fibrinogen'],
  },
  {
    title: 'Heart',
    icon: 'heart',
    origin: EARTH_WEARABLE,
    indicatorIds: ['heart_rate', 'resting_heart_rate', 'heart_rate_variability', 'vo2_max'],
  },
  { title: 'Breathing', icon: 'wind', origin: EARTH_WEARABLE, indicatorIds: ['spo2', 'breathing_rate'] },
  { title: 'Activity', icon: 'bolt', origin: EARTH_WEARABLE, indicatorIds: ['very_active_minutes', 'steps'] },
  {
    title: 'Sleep',
    icon: 'moon',
    origin: EARTH_WEARABLE,
    indicatorIds: ['sleep_duration', 'sleep_efficiency', 'sleep_awake_minutes'],
  },
  { title: 'Temperature', icon: 'temperature', origin: EARTH_WEARABLE, indicatorIds: ['skin_temperature'] },
  {
    title: 'Mind',
    icon: 'brain',
    origin: EARTH_WEARABLE,
    indicatorIds: ['stress_score', 'anxiety_score', 'positive_affect', 'negative_affect'],
  },
  { title: 'Ship', icon: 'radiation', origin: 'NASA RadLab, ISS detector', indicatorIds: ['radiation_dose_rate'] },
]

export const OTHER_GROUP: Omit<Group, 'indicatorIds'> = { title: 'Other', icon: 'chart', origin: '' }

// The few values worth a look every morning, shown on Today with their last two weeks
export const DAILY_VITAL_IDS = [
  'resting_heart_rate',
  'sleep_duration',
  'spo2',
  'skin_temperature',
  'very_active_minutes',
  'heart_rate_variability',
]
export const SPARKLINE_DAYS = 14

// The icon of an indicator when it differs from the icon of its group
const INDICATOR_ICONS: Record<string, IconName> = {
  vo2_max: 'bolt',
  heart_rate_variability: 'chart',
  spo2: 'drop',
  sleep_efficiency: 'ok',
  egfr: 'shield',
}

export function getIconOf(indicatorId: string): IconName {
  return INDICATOR_ICONS[indicatorId] ?? getGroupOf(indicatorId).icon
}

export function getGroupOf(indicatorId: string): Omit<Group, 'indicatorIds'> {
  return GROUPS.find((group) => group.indicatorIds.includes(indicatorId)) ?? OTHER_GROUP
}

export type RoutineTask = { title: string; icon: IconName; indicatorIds: string[] }

const getIdsOf = (groupTitle: string) => GROUPS.find((group) => group.title === groupTitle)?.indicatorIds ?? []

// What the astronaut measures by hand, one task per device or form. A task is done when its readings exist.
// The STAI and PANAS questionnaires are left out: they overlap with the daily check-in and have no rule.
export const ROUTINE_TASKS: RoutineTask[] = [
  { title: 'Daily check-in', icon: 'smile', indicatorIds: MOOD_ORDER },
  { title: 'Blood chemistry test', icon: 'drop', indicatorIds: getIdsOf('Blood chemistry') },
  { title: 'Blood count', icon: 'flask', indicatorIds: getIdsOf('Blood cells') },
  { title: 'Inflammation markers', icon: 'shield', indicatorIds: getIdsOf('Inflammation') },
]
