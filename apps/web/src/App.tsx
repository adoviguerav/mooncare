import { useState } from 'react'
import type { CrewMember } from './lib/api.ts'
import { useEmergency } from './lib/emergency.ts'
import { EmergencyScreen } from './features/emergency/EmergencyScreen.tsx'
import { IndicatorScreen } from './features/indicator/IndicatorScreen.tsx'
import { PanelScreen } from './features/panel/PanelScreen.tsx'
import { ProfilePicker } from './features/profile/ProfilePicker.tsx'

export default function App() {
  const [crewMember, setCrewMember] = useState<CrewMember | null>(null)
  const [indicatorId, setIndicatorId] = useState<string | null>(null)
  const emergency = useEmergency()
  // Which emergency this profile has left to look at its own panel. A new one takes the screen again.
  const [dismissedEmergency, setDismissedEmergency] = useState<string | null>(null)

  if (crewMember === null) {
    return <ProfilePicker onPick={setCrewMember} />
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
        emergencyRunning={emergency !== null}
        onOpenEmergency={() => setDismissedEmergency(null)}
        onOpenIndicator={setIndicatorId}
        onSwitchProfile={() => {
          setDismissedEmergency(null)
          setCrewMember(null)
        }}
      />
    )
  }
  return (
    <IndicatorScreen
      crewMember={crewMember}
      indicatorId={indicatorId}
      onBack={() => setIndicatorId(null)}
    />
  )
}
