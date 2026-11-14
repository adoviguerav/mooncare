const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const VALUE_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })
// Small values need the second decimal: a creatinine of 0.89 mg/dL is not 0.9
const SMALL_VALUE_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })
const SMALL_VALUE_BELOW = 10
const MIDNIGHT = '00:00'

const MINUTES_UNIT = 'min'
const MINUTES_PER_HOUR = 60
const MS_PER_DAY = 86_400_000

// The number and its unit apart, so a screen can show the unit smaller than the number
export function formatValueParts(value: number, unit: string | null): { amount: string; unit: string } {
  // A night of 542 min reads better as 9 h 2 min
  if (unit === MINUTES_UNIT && value >= MINUTES_PER_HOUR) {
    const minutes = Math.round(value)
    return { amount: `${Math.floor(minutes / MINUTES_PER_HOUR)} h ${minutes % MINUTES_PER_HOUR} min`, unit: '' }
  }
  const format = Math.abs(value) < SMALL_VALUE_BELOW ? SMALL_VALUE_FORMAT : VALUE_FORMAT
  return { amount: format.format(value), unit: unit ?? '' }
}

export function formatValue(value: number, unit: string | null): string {
  const parts = formatValueParts(value, unit)
  return parts.unit === '' ? parts.amount : `${parts.amount} ${parts.unit}`
}

// Daily values and blood draws are stored at 00:00, so the time is shown only when it says something.
export function formatTakenAt(takenAt: string): string {
  const [date, time] = takenAt.split('T')
  const day = DATE_FORMAT.format(new Date(`${date}T00:00`))
  return time === MIDNIGHT ? day : `${day}, ${time}`
}

export function addDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00Z`)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return shifted.toISOString().slice(0, 10)
}

export function countDaysSince(takenAt: string, today: string): number {
  return Math.round((Date.parse(`${today}T00:00Z`) - Date.parse(`${takenAt.slice(0, 10)}T00:00Z`)) / MS_PER_DAY)
}

// How old a reading is on the given day: a blood draw of six weeks ago must not read as today's
export function formatAge(takenAt: string, today: string): string {
  const days = countDaysSince(takenAt, today)
  if (days <= 0) return 'Today'
  return days === 1 ? 'Yesterday' : `${days} days ago`
}
