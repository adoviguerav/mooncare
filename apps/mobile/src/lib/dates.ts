// The readings come from datasets of 2021 and 2022, so "today" is a demo date, not the clock. It is 2021-11-02
// by default, and ?date=YYYY-MM-DD in the address picks another day (as in apps/web).

export const DEMO_DATE = '2021-11-02'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function getToday(): string {
  const requested = new URLSearchParams(window.location.search).get('date')
  return requested && DATE_PATTERN.test(requested) ? requested : DEMO_DATE
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** "2021-11-02" -> "Tue 2 Nov 2021" */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** "2021-11-02T09:00" -> "09:00" */
export const formatHour = (takenAt: string) => takenAt.slice(11, 16)

/** "2021-11-02T09:00" -> "2 Nov" */
export const formatShortDay = (takenAt: string) =>
  new Date(`${takenAt.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

/** Time since an ISO timestamp, in words: "3 min ago", "2 h ago". */
export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`
}
