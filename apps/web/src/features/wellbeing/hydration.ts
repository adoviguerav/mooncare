// The numbers and texts of the hydration fountain, the same as apps/mobile/src/wellbeing/HydrationSheet.tsx.
import type { HydrationDay } from '../../lib/api.ts'

export const DRINK_SIZES = [
  { ml: 100, label: 'Sip' },
  { ml: 200, label: 'Cup' },
  { ml: 300, label: 'Glass' },
  { ml: 500, label: 'Bottle' },
]
const PACE_START_HOUR = 7
const PACE_HOURS = 15
const AHEAD_ML = 500
const BEHIND_ML = 300
const PAST_GOAL = 1.3
const MINUTES_PER_HOUR = 60
const ML_PER_LITRE = 1000

export const formatLitres = (ml: number): string => (ml / ML_PER_LITRE).toFixed(1)

/** Where the fountain should be by now: from nothing at 07:00 to the goal at 22:00, on this device's clock */
export function getPaceMl(goalMl: number, at = new Date()): number {
  const hours = at.getHours() + at.getMinutes() / MINUTES_PER_HOUR
  return goalMl * Math.max(0, Math.min(1, (hours - PACE_START_HOUR) / PACE_HOURS))
}

export type HydrationTag = { tone: 'ok' | 'alert'; label: string }

export function getHydrationTag(day: HydrationDay, at = new Date()): HydrationTag {
  if (day.goal === null) return { tone: 'ok', label: 'No goal' }
  if (day.total_ml >= day.goal.ml) return { tone: 'ok', label: 'Goal reached' }
  const aheadMl = day.total_ml - getPaceMl(day.goal.ml, at)
  if (aheadMl < -BEHIND_ML) return { tone: 'alert', label: 'Behind pace' }
  return { tone: 'ok', label: aheadMl > AHEAD_ML ? 'Ahead of pace' : 'On pace' }
}

export function describeHydration(day: HydrationDay, at = new Date()): string {
  const goal = day.goal
  if (goal === null) {
    return 'There is no reference goal for this profile. Log your drinks; the flight surgeon sets your target.'
  }
  if (day.total_ml > goal.ml * PAST_GOAL) {
    return 'You are well past today’s goal. More is not better. Ask the flight surgeon if you are still thirsty.'
  }
  if (day.total_ml >= goal.ml) return 'Fountain full. You have reached today’s goal. Well done.'
  if (day.total_ml === 0) return `Fill the fountain with today’s water. Your goal is ${formatLitres(goal.ml)} L.`

  const aheadMl = day.total_ml - getPaceMl(goal.ml, at)
  const progress = `${Math.round((day.total_ml / goal.ml) * 100)}% full. ${goal.ml - day.total_ml} ml to go.`
  if (aheadMl > AHEAD_ML) return `${progress} Spread your drinks through the day.`
  return aheadMl < -BEHIND_ML ? `${progress} A drink now will catch you up.` : progress
}

export function describeGoalSource(day: HydrationDay): string {
  const goal = day.goal
  if (goal === null) return 'No reference goal: the profile has no sex recorded, and the reference differs for women and men.'
  return `Goal: ${formatLitres(goal.ml)} L from drinks, ${Math.round(goal.drinks_share * 100)}% of an adequate total water intake of ${formatLitres(goal.total_water_ml)} L a day. Source: ${goal.source}`
}
