// Calls the backend under /api. The session travels in an HttpOnly cookie that scripts cannot read, so every
// request goes with credentials and no token is ever handled here.

import type {
  BreathingDay,
  Checkin,
  CrewResponse,
  DailyChecklist,
  HydrationDay,
  IndicatorDetail,
  LoginResponse,
  Me,
  MoodId,
  NodeStatus,
  Panel,
  SignInUsersResponse,
  SyncOperation,
  SyncResult,
} from './types'

/** The server answered with an error. `status` is the HTTP status; `detail` its message. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
  }
}

/** The request never reached the server: the device is offline or the server is down. */
export class NetworkError extends Error {}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new NetworkError('The server cannot be reached')
  }
  if (!response.ok) {
    let detail = response.statusText
    try {
      const payload: unknown = await response.json()
      if (payload && typeof payload === 'object' && 'detail' in payload && typeof payload.detail === 'string') {
        detail = payload.detail
      }
    } catch {
      // the body was not JSON: keep the status text
    }
    throw new ApiError(response.status, detail)
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

const query = (params: Record<string, string>) => new URLSearchParams(params).toString()

export const api = {
  // Sign-in
  signInUsers: () => request<SignInUsersResponse>('GET', '/auth/users'),
  login: (userId: number, pin: string) => request<LoginResponse>('POST', '/auth/login', { user_id: userId, pin }),
  logout: () => request<void>('POST', '/auth/logout'),
  me: () => request<Me>('GET', '/auth/me'),

  // Crew and panel
  crew: () => request<CrewResponse>('GET', '/crew'),
  panel: (crewMemberId: number, date: string) =>
    request<Panel>('GET', `/crew/${crewMemberId}/panel?${query({ date })}`),
  indicator: (crewMemberId: number, indicatorId: string, from: string, to: string) =>
    request<IndicatorDetail>('GET', `/crew/${crewMemberId}/indicators/${indicatorId}?${query({ from, to })}`),
  saveCheckin: (crewMemberId: number, date: string, moods: MoodId[]) =>
    request<Checkin>('PUT', `/crew/${crewMemberId}/checkins/${date}`, { moods }),

  // Daily checklist
  checklist: (crewMemberId: number, date: string) => request<DailyChecklist>('GET', `/crew/${crewMemberId}/tasks/${date}`),
  tickTask: (crewMemberId: number, date: string, taskId: string, done: boolean) =>
    request<DailyChecklist>('PUT', `/crew/${crewMemberId}/tasks/${date}/${taskId}`, { done }),

  // Moon and earth servers
  // Hydration and breathing: reading follows the panel's access, writing is only the crew member themselves
  hydration: (crewMemberId: number, date: string) => request<HydrationDay>('GET', `/crew/${crewMemberId}/hydration/${date}`),
  logDrink: (crewMemberId: number, date: string, ml: number) =>
    request<HydrationDay>('POST', `/crew/${crewMemberId}/hydration/${date}`, { ml }),
  undoDrink: (crewMemberId: number, date: string) => request<HydrationDay>('POST', `/crew/${crewMemberId}/hydration/${date}/undo`),
  breathing: (crewMemberId: number, date: string) => request<BreathingDay>('GET', `/crew/${crewMemberId}/breathing/${date}`),
  logBreathing: (crewMemberId: number, date: string, breaths: number) =>
    request<BreathingDay>('POST', `/crew/${crewMemberId}/breathing/${date}`, { breaths }),

  node: () => request<NodeStatus>('GET', '/node'),
  syncHistory: (limit = 20) => request<SyncOperation[]>('GET', `/sync/history?${query({ limit: String(limit) })}`),
  sync: () => request<SyncResult>('POST', '/sync'),
}
