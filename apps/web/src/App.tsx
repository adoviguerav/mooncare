import { useEffect, useState } from 'react'
import { fetchMe, fetchSignInUsers, signOut } from './lib/api.ts'
import type { CrewMember, Me } from './lib/api.ts'
import { useEmergency } from './lib/emergency.ts'
import { EmergencyScreen } from './features/emergency/EmergencyScreen.tsx'
import { IndicatorScreen } from './features/indicator/IndicatorScreen.tsx'
import { PanelScreen } from './features/panel/PanelScreen.tsx'
import { ProfilePicker } from './features/profile/ProfilePicker.tsx'
import { SignInScreen } from './features/signin/SignInScreen.tsx'

// Who sees the whole crew: they pick whose panel to open. A crew member opens only their own.
const CREW_WIDE_ROLES = ['commander', 'medical_officer', 'earth_admin']

export default function App() {
  // undefined while asking the server who is signed in; null when nobody is
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  // A server with no accounts yet (its database has not run migrations/2026-11-15_demo_users.sql) opens with no
  // sign-in, as the dashboard did before. As soon as it has accounts, it asks for a PIN.
  const [openAccess, setOpenAccess] = useState(false)
  const [pickedCrewMember, setCrewMember] = useState<CrewMember | null>(null)
  const [indicatorId, setIndicatorId] = useState<string | null>(null)
  const emergency = useEmergency()
  // Which emergency this profile has left to look at its own panel. A new one takes the screen again.
  const [dismissedEmergency, setDismissedEmergency] = useState<string | null>(null)

  useEffect(() => {
    async function findOut() {
      const signedIn = await fetchMe().catch(() => null)
      if (signedIn === null) {
        const users = await fetchSignInUsers().catch(() => [])
        setOpenAccess(users.length === 0)
      }
      setMe(signedIn)
    }
    void findOut()
  }, [])

  const crewWide = openAccess || (me != null && CREW_WIDE_ROLES.includes(me.role))
  // A crew member has one panel, their own: there is no profile to pick
  const ownCrewMember: CrewMember | null =
    me != null && !crewWide && me.crew_member_id !== null && me.role !== 'earth_admin'
      ? { id: me.crew_member_id, name: me.display_name, role: me.role }
      : null
  const crewMember = crewWide ? pickedCrewMember : ownCrewMember

  async function leave() {
    try {
      await signOut()
    } finally {
      setCrewMember(null)
      setIndicatorId(null)
      setMe(null)
    }
  }

  if (me === undefined) {
    return (
      <main className="screen picker">
        <p className="muted">Connecting to the base server…</p>
      </main>
    )
  }
  if (me === null && !openAccess) {
    return <SignInScreen onSignedIn={setMe} />
  }
  if (crewMember === null) {
    return <ProfilePicker me={me} onPick={setCrewMember} onSignOut={() => void leave()} />
  }
  if (emergency !== null && dismissedEmergency !== emergency.startedAt) {
    return (
      <EmergencyScreen
        // A new profile starts on the alert, not where the last one left the screen
        key={crewMember.id}
        crewMember={crewMember}
        emergency={emergency}
        onOpenPanel={() => setDismissedEmergency(emergency.startedAt)}
      />
    )
  }
  if (indicatorId === null) {
    return (
      <PanelScreen
        crewMember={crewMember}
        // Only the crew member themselves logs their drinks and sessions. With no sign-in, nobody is them.
        canLog={me != null && me.crew_member_id === crewMember.id}
        // The server takes a check-in only from the crew member, or from anyone while it has no accounts
        canCheckIn={me == null || me.crew_member_id === crewMember.id}
        emergencyRunning={emergency !== null}
        onOpenEmergency={() => setDismissedEmergency(null)}
        onOpenIndicator={setIndicatorId}
        onSwitchProfile={() => {
          setDismissedEmergency(null)
          // A crew member has no other profile: switching means signing out
          if (crewWide) setCrewMember(null)
          else void leave()
        }}
      />
    )
  }
  return (
    <IndicatorScreen
      // A new screen for each parameter: it loads its data once, when it opens
      key={indicatorId}
      crewMember={crewMember}
      indicatorId={indicatorId}
      onBack={() => setIndicatorId(null)}
      onOpenIndicator={(id) => {
        setIndicatorId(id)
        window.scrollTo(0, 0)
      }}
    />
  )
}
