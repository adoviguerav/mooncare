const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const VALUE_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })
// Small values need the second decimal: a creatinine of 0.89 mg/dL is not 0.9
const SMALL_VALUE_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })
const SMALL_VALUE_BELOW = 10
const MIDNIGHT = '00:00'

export function formatValue(value: number, unit: string | null): string {
  const format = Math.abs(value) < SMALL_VALUE_BELOW ? SMALL_VALUE_FORMAT : VALUE_FORMAT
  return unit === null ? format.format(value) : `${format.format(value)} ${unit}`
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
