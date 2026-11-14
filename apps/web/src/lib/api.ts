// The contracts of docs/mvp_architecture.md, section 3.

export type CrewRole = 'commander' | 'crew_member'

export type CrewMember = { id: number; name: string; role: CrewRole }

export type Reading = { taken_at: string; value: number }

export type BrokenRule = { id: number; title: string; explanation: string; action: string }

export type PanelIndicator = {
  id: string
  name: string
  unit: string | null
  reading: Reading | null
  broken_rule: BrokenRule | null
}

export type Panel = { date: string; indicators: PanelIndicator[] }

export type Source = { id: string; name: string; url: string; citation: string }

export type Indicator = {
  id: string
  name: string
  unit: string | null
  how_to_measure: string
  why_it_matters: string
  source: Source
}

export type Rule = {
  id: number
  low: number | null
  high: number | null
  title: string
  explanation: string
  action: string
  threshold_source: string
}

export type HistoryReading = Reading & { broken_rule_id: number | null }

export type IndicatorDetail = { indicator: Indicator; rules: Rule[]; readings: HistoryReading[] }

export type MoodId =
  | 'mood_happy'
  | 'mood_sad'
  | 'mood_tense'
  | 'mood_alert'
  | 'mood_rested'
  | 'mood_neutral'
  | 'mood_tired'

export type Checkin = { date: string; moods: MoodId[] }

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`)
  }
  return (await response.json()) as T
}

export async function fetchCrew(): Promise<CrewMember[]> {
  const { crew } = await getJson<{ crew: CrewMember[] }>('/api/crew')
  return crew
}

export function fetchPanel(crewMemberId: number, date: string): Promise<Panel> {
  return getJson(`/api/crew/${crewMemberId}/panel?date=${date}`)
}

export function fetchIndicatorDetail(
  crewMemberId: number,
  indicatorId: string,
  from: string,
  to: string,
): Promise<IndicatorDetail> {
  return getJson(`/api/crew/${crewMemberId}/indicators/${indicatorId}?from=${from}&to=${to}`)
}

export async function saveCheckin(crewMemberId: number, date: string, moods: MoodId[]): Promise<Checkin> {
  const path = `/api/crew/${crewMemberId}/checkins/${date}`
  const response = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moods }),
  })
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`)
  }
  return (await response.json()) as Checkin
}
