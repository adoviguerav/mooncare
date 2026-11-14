import { useSyncExternalStore } from 'react'
import type { EventId } from './procedures.ts'

// The simulated emergency lives in this browser only, so a demo can be started and repeated without
// touching the database. shortcut: every profile must be opened on the same device to see it;
// move it to the backend when two tablets have to share one emergency.
const STORAGE_KEY = 'emergency'
const CHANGE_EVENT = 'emergency-change'

export type Emergency = {
  // What the model flagged, which decides the procedure the guide opens
  event: EventId
  patientId: number
  patientName: string
  // Real clock time, to count how long the response has taken
  startedAt: string
  // Where the medical officer is in the procedure. Null until the guide is opened.
  stepId: string | null
  stepStartedAt: string | null
  // The steps she has been through, oldest first, so she can go back
  path: string[]
  // What has been found so far, by its name in the manual: a symptom that is present, or a value of a form.
  // It is the report that goes to the Surgeon when the link returns.
  record: Record<string, string>
  // When the medical officer closed the case, which puts the report in the queue
  closedAt: string | null
  // When the report left for Earth. Null while there is no link.
  sentAt: string | null
}

let cachedRaw: string | null = null
let cachedEmergency: Emergency | null = null

function parseEmergency(raw: string): Emergency {
  const saved = JSON.parse(raw) as Omit<Emergency, 'event' | 'path' | 'record' | 'closedAt' | 'sentAt'> & {
    event?: EventId
    path?: string[]
    record?: Record<string, string>
    closedAt?: string | null
    sentAt?: string | null
  }
  // An emergency saved before there were two kinds of event is a cardiac one
  return {
    ...saved,
    event: saved.event ?? 'cardiac',
    path: saved.path ?? [],
    record: saved.record ?? {},
    closedAt: saved.closedAt ?? null,
    sentAt: saved.sentAt ?? null,
  }
}

function readEmergency(): Emergency | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedEmergency = raw === null ? null : parseEmergency(raw)
  }
  return cachedEmergency
}

function writeEmergency(emergency: Emergency | null) {
  if (emergency === null) localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(emergency))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  // "storage" comes from other tabs, the custom event from this one
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function useEmergency(): Emergency | null {
  return useSyncExternalStore(subscribe, readEmergency)
}

export function startEmergency(event: EventId, patientId: number, patientName: string): void {
  writeEmergency({
    event,
    patientId,
    patientName,
    startedAt: new Date().toISOString(),
    stepId: null,
    stepStartedAt: null,
    path: [],
    record: {},
    closedAt: null,
    sentAt: null,
  })
}

export function goToStep(stepId: string): void {
  const emergency = readEmergency()
  if (emergency === null || emergency.stepId === stepId) return
  const path = emergency.stepId === null ? emergency.path : [...emergency.path, emergency.stepId]
  writeEmergency({ ...emergency, stepId, stepStartedAt: new Date().toISOString(), path })
}

// Returns to the step she came from
export function goBack(): void {
  const emergency = readEmergency()
  const cameFrom = emergency?.path.at(-1)
  if (emergency === null || cameFrom === undefined) return
  writeEmergency({
    ...emergency,
    stepId: cameFrom,
    stepStartedAt: new Date().toISOString(),
    path: emergency.path.slice(0, -1),
  })
}

// Writes a finding into the report, or takes it out when the value is null
export function recordFinding(name: string, value: string | null): void {
  const emergency = readEmergency()
  if (emergency === null) return
  const { [name]: _removed, ...others } = emergency.record
  writeEmergency({ ...emergency, record: value === null ? others : { ...others, [name]: value } })
}

export function closeCase(): void {
  const emergency = readEmergency()
  if (emergency !== null) writeEmergency({ ...emergency, closedAt: new Date().toISOString() })
}

// The simulated return of the link: the queued report leaves for Earth
export function sendReport(): void {
  const emergency = readEmergency()
  if (emergency !== null) writeEmergency({ ...emergency, sentAt: new Date().toISOString() })
}

export function endEmergency() {
  writeEmergency(null)
}
