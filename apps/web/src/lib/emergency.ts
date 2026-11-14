import { useSyncExternalStore } from 'react'

// The simulated emergency lives in this browser only, so a demo can be started and repeated without
// touching the database. shortcut: every profile must be opened on the same device to see it;
// move it to the backend when two tablets have to share one emergency.
const STORAGE_KEY = 'emergency'
const CHANGE_EVENT = 'emergency-change'

export type Emergency = {
  patientId: number
  patientName: string
  // Real clock time, to count how long the response has taken
  startedAt: string
  // Where the medical officer is in the procedure. Null until the guide is opened.
  stepId: string | null
  stepStartedAt: string | null
}

let cachedRaw: string | null = null
let cachedEmergency: Emergency | null = null

function readEmergency(): Emergency | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedEmergency = raw === null ? null : (JSON.parse(raw) as Emergency)
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

export function startEmergency(patientId: number, patientName: string) {
  writeEmergency({ patientId, patientName, startedAt: new Date().toISOString(), stepId: null, stepStartedAt: null })
}

export function goToStep(stepId: string) {
  const emergency = readEmergency()
  if (emergency !== null) writeEmergency({ ...emergency, stepId, stepStartedAt: new Date().toISOString() })
}

export function endEmergency() {
  writeEmergency(null)
}
