// The contracts of the FastAPI backend: docs/mvp_architecture.md (section 3) and docs/moon_earth_sync.md
// (section 5), plus the sign-in endpoints of services/api/app/auth.py. Shared by apps/mobile and apps/web.

export type NodeRole = 'moon' | 'earth'
export type UserRole = 'crew_member' | 'commander' | 'earth_admin'
export type CrewRole = 'commander' | 'crew_member'

// --- Sign-in ---

export type SignInUser = { id: number; display_name: string; role: UserRole; crew_member_id: number | null }

export type SignInUsersResponse = { node_role: NodeRole; users: SignInUser[] }

export type Me = {
  id: number
  display_name: string
  role: UserRole
  crew_member_id: number | null
  node_role: NodeRole
}

export type LoginResponse = { user: Me; expires_at: string; token: string | null }

// --- Crew and panel ---

export type CrewMember = { id: number; name: string; role: CrewRole }

export type CrewResponse = { crew: CrewMember[] }

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

export type HistoryReading = { taken_at: string; value: number; broken_rule_id: number | null }

export type IndicatorDetail = { indicator: Indicator; rules: Rule[]; readings: HistoryReading[] }

export type MoodId = 'mood_happy' | 'mood_sad' | 'mood_tense' | 'mood_alert' | 'mood_rested' | 'mood_neutral'

export type Checkin = { date: string; moods: MoodId[] }

// --- Moon and earth servers ---

export type SyncOperation = {
  id: number
  direction: 'push' | 'pull' | 'received_push' | 'served_pull'
  peer: string
  started_at: string
  finished_at: string
  status: 'ok' | 'failed'
  row_count: number
  from_seq: number | null
  to_seq: number | null
  error: string | null
}

export type NodeStatus = {
  role: NodeRole
  sync_configured: boolean
  earth_url: string | null
  pending_push_rows: number | null
  last_push: SyncOperation | null
  last_pull: SyncOperation | null
}

export type SyncResult = { push: SyncOperation | null; pull: SyncOperation | null }
