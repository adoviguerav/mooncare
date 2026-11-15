// What the app keeps on the device so it still works when the moon server cannot be reached:
// - the last panel it loaded, per crew member and day, to show instead of an empty screen;
// - check-ins saved while offline, sent as soon as the server answers again. They are never dropped.
// Kept in localStorage, which can be missing or full (private windows): every access is wrapped.

import { ApiError, NetworkError, api } from '@mooncare/api'
import type { MoodId, Panel } from '@mooncare/api'

const PANEL_KEY = 'mooncare.panel'
const PENDING_KEY = 'mooncare.pendingCheckins'

export type PendingCheckin = { crewMemberId: number; date: string; moods: MoodId[]; savedAt: string }

function read<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable or full: the app goes on without the copy
  }
}

export function savePanelCopy(crewMemberId: number, panel: Panel): void {
  write(PANEL_KEY, { crewMemberId, panel, savedAt: new Date().toISOString() })
}

export function readPanelCopy(crewMemberId: number, date: string): { panel: Panel; savedAt: string } | null {
  const copy = read<{ crewMemberId: number; panel: Panel; savedAt: string } | null>(PANEL_KEY, null)
  return copy && copy.crewMemberId === crewMemberId && copy.panel.date === date ? copy : null
}

export const readPendingCheckins = () => read<PendingCheckin[]>(PENDING_KEY, [])

/** Keeps a check-in to send later. A newer one for the same day replaces the older, as the server would. */
export function queueCheckin(checkin: PendingCheckin): void {
  const others = readPendingCheckins().filter(
    (pending) => !(pending.crewMemberId === checkin.crewMemberId && pending.date === checkin.date),
  )
  write(PENDING_KEY, [...others, checkin])
}

/** Sends the queued check-ins, oldest first. Stops at the first network failure and keeps the rest. */
export async function flushPendingCheckins(): Promise<number> {
  const pending = readPendingCheckins()
  let sent = 0
  for (const checkin of pending) {
    try {
      await api.saveCheckin(checkin.crewMemberId, checkin.date, checkin.moods)
      sent += 1
    } catch (error) {
      // Offline, or the session ended: keep it and the rest for the next try, after signing in again
      if (error instanceof NetworkError || (error instanceof ApiError && error.status === 401)) break
      sent += 1 // refused for good (for example not allowed): retrying would never succeed
    }
  }
  write(PENDING_KEY, pending.slice(sent))
  return sent
}

/** Clears everything kept for the signed-in user. Called on sign-out. */
export function clearDeviceCopies(): void {
  try {
    localStorage.removeItem(PANEL_KEY)
    localStorage.removeItem(PENDING_KEY)
  } catch {
    // nothing to clear
  }
}
