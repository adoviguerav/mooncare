// How the app presents each indicator. The values, limits and alerts all come from the backend; this file only
// says which body system an indicator belongs to and how to print it. Modules and priorities follow
// docs/parameters_and_datasets.md, table 1. The priorities there are a proposal not yet confirmed.

import type { MoodId, PanelIndicator, Rule } from '@mooncare/api'

export type Module = 'CARDIO' | 'MIND' | 'NUTRI' | 'IMMUNE' | 'BONE' | 'VITAL'

export const MODULES: Module[] = ['CARDIO', 'MIND', 'NUTRI', 'IMMUNE', 'BONE', 'VITAL']

export const MODULE_NAMES: Record<Module, string> = {
  CARDIO: 'Heart and circulation',
  MIND: 'Sleep and mind',
  NUTRI: 'Nutrition',
  IMMUNE: 'Immune system',
  BONE: 'Bone and muscle',
  VITAL: 'Vital functions',
}

type Presentation = { module: Module; priority: 'L1' | 'L2' | 'L3' | 'L4' }

const PRESENTATION: Record<string, Presentation> = {
  // CARDIO
  heart_rate: { module: 'CARDIO', priority: 'L3' },
  resting_heart_rate: { module: 'CARDIO', priority: 'L3' },
  spo2: { module: 'CARDIO', priority: 'L2' },
  heart_rate_variability: { module: 'CARDIO', priority: 'L3' },
  vo2_max: { module: 'CARDIO', priority: 'L3' },
  crp: { module: 'CARDIO', priority: 'L3' },
  fibrinogen: { module: 'CARDIO', priority: 'L3' },
  // NUTRI
  glucose: { module: 'NUTRI', priority: 'L2' },
  sodium: { module: 'NUTRI', priority: 'L2' },
  potassium: { module: 'NUTRI', priority: 'L2' },
  chloride: { module: 'NUTRI', priority: 'L2' },
  albumin: { module: 'NUTRI', priority: 'L3' },
  hemoglobin: { module: 'NUTRI', priority: 'L3' },
  calcium: { module: 'NUTRI', priority: 'L3' },
  // VITAL
  breathing_rate: { module: 'VITAL', priority: 'L2' },
  creatinine: { module: 'VITAL', priority: 'L2' },
  urea_nitrogen: { module: 'VITAL', priority: 'L2' },
  egfr: { module: 'VITAL', priority: 'L2' },
  radiation_dose_rate: { module: 'VITAL', priority: 'L2' },
  // IMMUNE
  skin_temperature: { module: 'IMMUNE', priority: 'L2' },
  white_blood_cells: { module: 'IMMUNE', priority: 'L2' },
  lymphocytes: { module: 'IMMUNE', priority: 'L2' },
  il_6: { module: 'IMMUNE', priority: 'L2' },
  tnf_alpha: { module: 'IMMUNE', priority: 'L2' },
  il_1_beta: { module: 'IMMUNE', priority: 'L2' },
  ifn_gamma: { module: 'IMMUNE', priority: 'L2' },
  // BONE
  very_active_minutes: { module: 'BONE', priority: 'L3' },
  steps: { module: 'BONE', priority: 'L3' },
  // MIND
  sleep_duration: { module: 'MIND', priority: 'L3' },
  sleep_efficiency: { module: 'MIND', priority: 'L3' },
  sleep_awake_minutes: { module: 'MIND', priority: 'L3' },
  stress_score: { module: 'MIND', priority: 'L3' },
  anxiety_score: { module: 'MIND', priority: 'L3' },
  positive_affect: { module: 'MIND', priority: 'L3' },
  negative_affect: { module: 'MIND', priority: 'L3' },
}

export const MOODS: { id: MoodId; label: string; face: string }[] = [
  { id: 'mood_happy', label: 'Happy', face: '😄' },
  { id: 'mood_rested', label: 'Rested', face: '😌' },
  { id: 'mood_alert', label: 'Alert', face: '⚡' },
  { id: 'mood_neutral', label: 'Neutral', face: '😐' },
  { id: 'mood_tense', label: 'Tense', face: '😬' },
  { id: 'mood_sad', label: 'Sad', face: '😢' },
  { id: 'mood_tired', label: 'Tired', face: '🥱' },
]

const MOOD_IDS = new Set<string>(MOODS.map((mood) => mood.id))

/** The six check-in moods and their two 14-day counts are shown together on the mood card, not as cards. */
export const isMood = (indicatorId: string) => indicatorId.startsWith('mood_')
export const isCheckinMood = (indicatorId: string): indicatorId is MoodId => MOOD_IDS.has(indicatorId)

export const moduleOf = (indicatorId: string): Module =>
  isMood(indicatorId) ? 'MIND' : (PRESENTATION[indicatorId]?.module ?? 'VITAL')

export const priorityOf = (indicatorId: string) => (isMood(indicatorId) ? 'L2' : PRESENTATION[indicatorId]?.priority)

/** Vital-sign cards: every indicator except the moods, in the backend's order. */
export const vitalCards = (indicators: PanelIndicator[]) => indicators.filter((indicator) => !isMood(indicator.id))

export function formatValue(value: number, unit: string | null): string {
  if (unit === 'steps') return Math.round(value).toLocaleString('en')
  if (unit === 'min' && value >= 90) {
    const hours = Math.floor(value / 60)
    return `${hours} h ${String(Math.round(value - hours * 60)).padStart(2, '0')}`
  }
  if (Number.isInteger(value) || Math.abs(value) >= 100) return Math.round(value).toLocaleString('en')
  return value.toFixed(1)
}

/** The unit shown next to a value. Long durations already carry "h" in the value. */
export const shownUnit = (value: number, unit: string | null) => (unit === 'min' && value >= 90 ? '' : (unit ?? ''))

export function formatReading(indicator: PanelIndicator): string {
  if (!indicator.reading) return '—'
  const { value } = indicator.reading
  return `${formatValue(value, indicator.unit)} ${shownUnit(value, indicator.unit)}`.trim()
}

/** "65 to 99 mg/dL", "at least 7 h 00", "at most 100 bpm", or "well below your own usual value": what a rule allows. */
export function describeLimits(rule: Rule, unit: string | null): string {
  if (rule.baseline_direction !== null) return `well ${rule.baseline_direction} your own usual value`
  const show = (value: number) => `${formatValue(value, unit)} ${shownUnit(value, unit)}`.trim()
  if (rule.low != null && rule.high != null) return `${show(rule.low)} to ${show(rule.high)}`
  if (rule.low != null) return `at least ${show(rule.low)}`
  return `at most ${show(rule.high!)}`
}
