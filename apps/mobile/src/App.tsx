import { useEffect, useState } from 'react'
import { ApiError, NetworkError, api } from '@mooncare/api'
import type { CrewMember, Me, UserRole } from '@mooncare/api'
import { EmergencyScreen } from '@mooncare/web/features/emergency/EmergencyScreen.tsx'
import { ProfilePicker } from '@mooncare/web/features/profile/ProfilePicker.tsx'
import { useEmergency } from '@mooncare/web/lib/emergency.ts'
import { CrewApp } from './screens/CrewApp'
import { SignInScreen } from './screens/SignInScreen'
import { clearDeviceCopies } from './lib/offline'

// Who was signed in last on this device, to open the saved panel when the server cannot be reached. Not a
// secret: the session itself is the HttpOnly cookie, which this code never sees.
const ME_KEY = 'mooncare.me'

function rememberMe(me: Me | null): void {
  try {
    if (me) localStorage.setItem(ME_KEY, JSON.stringify(me))
    else localStorage.removeItem(ME_KEY)
  } catch {
    // storage unavailable: offline start will not work, everything else does
  }
}

function rememberedMe(): Me | null {
  try {
    const stored = localStorage.getItem(ME_KEY)
    return stored ? (JSON.parse(stored) as Me) : null
  } catch {
    return null
  }
}

// Who sees the whole crew: they pick whose panel to open. A crew member opens only their own.
const CREW_WIDE_ROLES: UserRole[] = ['commander', 'medical_officer', 'earth_admin']

type State =
  | { kind: 'checking' }
  | { kind: 'signed-out' }
  | { kind: 'signed-in'; me: Me; offline: boolean }
  | { kind: 'unreachable' }

export function App() {
  const [state, setState] = useState<State>({ kind: 'checking' })

  useEffect(() => {
    api
      .me()
      .then((me) => {
        rememberMe(me)
        setState({ kind: 'signed-in', me, offline: false })
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          rememberMe(null)
          setState({ kind: 'signed-out' })
        } else if (error instanceof NetworkError) {
          const me = rememberedMe()
          setState(me ? { kind: 'signed-in', me, offline: true } : { kind: 'unreachable' })
        } else {
          setState({ kind: 'signed-out' })
        }
      })
  }, [])

  async function signOut() {
    try {
      await api.logout()
    } catch {
      // already signed out, or offline: the cookie expires on its own and the copies are cleared below
    }
    rememberMe(null)
    clearDeviceCopies()
    setState({ kind: 'signed-out' })
  }

  switch (state.kind) {
    case 'checking':
      return <p className="signin note">Connecting to the lunar base…</p>
    case 'unreachable':
      return (
        <main className="signin">
          <p className="err">The lunar base server cannot be reached, and nobody has signed in on this device yet.</p>
          <button className="linkbtn" type="button" style={{ maxWidth: 320 }} onClick={() => window.location.reload()}>
            Try again
          </button>
        </main>
      )
    case 'signed-out':
      return (
        <SignInScreen
          onSignedIn={(me) => {
            rememberMe(me)
            setState({ kind: 'signed-in', me, offline: false })
          }}
        />
      )
    case 'signed-in':
      return (
        <SignedIn
          me={state.me}
          startedOffline={state.offline}
          onSessionEnded={() => {
            rememberMe(null)
            setState({ kind: 'signed-out' })
          }}
          onSignOut={signOut}
        />
      )
  }
}

/** What a signed-in user sees: the crew list for those who see everyone, a running medical alert, or a panel. */
function SignedIn({
  me,
  startedOffline,
  onSessionEnded,
  onSignOut,
}: {
  me: Me
  startedOffline: boolean
  onSessionEnded: () => void
  onSignOut: () => void
}) {
  const crewWide = CREW_WIDE_ROLES.includes(me.role)
  const [picked, setPicked] = useState<CrewMember | null>(null)
  const emergency = useEmergency()
  // Which alert this user has left to look at a panel. A new one takes the screen again.
  const [dismissedEmergency, setDismissedEmergency] = useState<string | null>(null)

  const own: CrewMember | null =
    me.crew_member_id !== null && me.role !== 'earth_admin'
      ? { id: me.crew_member_id, name: me.display_name, role: me.role }
      : null
  const viewed = crewWide ? picked : own

  // The crew list and the alert are the dashboard's own screens, with its look
  if (crewWide && viewed === null) {
    return (
      <div className="web-ui web-screen">
        <ProfilePicker me={me} onPick={setPicked} onSignOut={onSignOut} />
      </div>
    )
  }
  if (viewed !== null && emergency !== null && dismissedEmergency !== emergency.startedAt) {
    return (
      <div className="web-ui web-screen">
        <EmergencyScreen
          // A new profile starts on the alert, not where the last one left the screen
          key={viewed.id}
          crewMember={viewed}
          emergency={emergency}
          onOpenPanel={() => setDismissedEmergency(emergency.startedAt)}
        />
      </div>
    )
  }
  return (
    <CrewApp
      // A new panel for each crew member: nothing of the one before stays on screen
      key={viewed?.id}
      me={me}
      viewed={viewed}
      startedOffline={startedOffline}
      emergencyRunning={emergency !== null}
      onOpenEmergency={() => setDismissedEmergency(null)}
      onSwitchCrewMember={
        crewWide
          ? () => {
              setDismissedEmergency(null)
              setPicked(null)
            }
          : null
      }
      onSessionEnded={onSessionEnded}
      onSignOut={onSignOut}
    />
  )
}
