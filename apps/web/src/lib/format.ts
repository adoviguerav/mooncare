const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const VALUE_FORMAT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })
const MIDNIGHT = '00:00'

export function formatValue(value: number, unit: string | null): string {
  return unit === null ? VALUE_FORMAT.format(value) : `${VALUE_FORMAT.format(value)} ${unit}`
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
