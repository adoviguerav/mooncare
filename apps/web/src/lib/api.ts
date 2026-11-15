// The contracts of docs/mvp_architecture.md, section 3.

export type CrewRole = 'commander' | 'medical_officer' | 'crew_member'

export type CrewMember = { id: number; name: string; role: CrewRole }

export type Reading = { taken_at: string; value: number }

export type BrokenRule = { id: number; title: string; explanation: string; action: string }

export type PanelIndicator = {
  id: string
  name: string
  unit: string | null
  reading: Reading | null
  measured_by: 'sensor' | 'astronaut' | 'computed'
  cadence_days: number | null
  // A new reading is expected by the day of the panel and has not arrived
  due: boolean
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
  // Set on a personal baseline rule, which has no low or high
  baseline_direction: 'above' | 'below' | null
  baseline_deviations: number | null
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

// A signed URL that opens one conversation with the voice agent of the emergency guide.
// It fails when the server has no agent set up or the network is slow or down.
const VOICE_SESSION_TIMEOUT_MS = 5000

export async function createVoiceSession(): Promise<string> {
  const path = '/api/emergency/voice-session'
  const response = await fetch(path, { method: 'POST', signal: AbortSignal.timeout(VOICE_SESSION_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`)
  }
  const { signed_url } = (await response.json()) as { signed_url: string }
  return signed_url
}

// --- Sign-in (services/api/app/auth.py). The session is an HttpOnly cookie the browser sends on its own. ---

export type UserRole = CrewRole | 'earth_admin'

export type SignInUser = { id: number; display_name: string; role: UserRole; crew_member_id: number | null }

export type Me = SignInUser & { node_role: 'moon' | 'earth' }

/** The server answered with an error: 401 not signed in or wrong PIN, 429 locked for a while */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function sendJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    let detail = `${path} returned ${response.status}`
    try {
      const payload = (await response.json()) as { detail?: unknown }
      if (typeof payload.detail === 'string') detail = payload.detail
    } catch {
      // not JSON: keep the status
    }
    throw new ApiError(response.status, detail)
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

export async function fetchSignInUsers(): Promise<SignInUser[]> {
  const { users } = await sendJson<{ users: SignInUser[] }>('GET', '/api/auth/users')
  return users
}

export async function signIn(userId: number, pin: string): Promise<Me> {
  const { user } = await sendJson<{ user: Me }>('POST', '/api/auth/login', { user_id: userId, pin })
  return user
}

export function signOut(): Promise<void> {
  return sendJson<void>('POST', '/api/auth/logout')
}

/** Who is signed in on this browser, or null when nobody is */
export async function fetchMe(): Promise<Me | null> {
  try {
    return await sendJson<Me>('GET', '/api/auth/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

// --- Hydration, breathing and the daily tasks (services/api/app/wellbeing.py and daily.py). Reading follows the
// panel's access; writing is only for the crew member themselves. ---

export type HydrationGoal = { ml: number; total_water_ml: number; drinks_share: number; source: string }

export type Drink = { drunk_at: string; ml: number }

export type HydrationDay = {
  date: string
  // null: no sex recorded for the crew member, so no reference goal
  goal: HydrationGoal | null
  total_ml: number
  drinks: Drink[]
  full_days_in_a_row: number
}

export type BreathingDay = { date: string; sessions: number }

export type DailyTask = { id: string; title: string; done: boolean }

export type DailyChecklist = { date: string; tasks: DailyTask[] }

export function fetchHydration(crewMemberId: number, date: string): Promise<HydrationDay> {
  return sendJson('GET', `/api/crew/${crewMemberId}/hydration/${date}`)
}

export function logDrink(crewMemberId: number, date: string, ml: number): Promise<HydrationDay> {
  return sendJson('POST', `/api/crew/${crewMemberId}/hydration/${date}`, { ml })
}

export function undoDrink(crewMemberId: number, date: string): Promise<HydrationDay> {
  return sendJson('POST', `/api/crew/${crewMemberId}/hydration/${date}/undo`)
}

export function fetchBreathing(crewMemberId: number, date: string): Promise<BreathingDay> {
  return sendJson('GET', `/api/crew/${crewMemberId}/breathing/${date}`)
}

export function logBreathing(crewMemberId: number, date: string, breaths: number): Promise<BreathingDay> {
  return sendJson('POST', `/api/crew/${crewMemberId}/breathing/${date}`, { breaths })
}

export function fetchChecklist(crewMemberId: number, date: string): Promise<DailyChecklist> {
  return sendJson('GET', `/api/crew/${crewMemberId}/tasks/${date}`)
}

export function tickTask(crewMemberId: number, date: string, taskId: string): Promise<DailyChecklist> {
  return sendJson('PUT', `/api/crew/${crewMemberId}/tasks/${date}/${taskId}`, { done: true })
}
