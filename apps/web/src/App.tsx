import { useState } from 'react'
import type { CrewMember } from './lib/api.ts'
import { IndicatorScreen } from './features/indicator/IndicatorScreen.tsx'
import { PanelScreen } from './features/panel/PanelScreen.tsx'
import { ProfilePicker } from './features/profile/ProfilePicker.tsx'

export default function App() {
  const [crewMember, setCrewMember] = useState<CrewMember | null>(null)
  const [indicatorId, setIndicatorId] = useState<string | null>(null)

  if (crewMember === null) {
    return <ProfilePicker onPick={setCrewMember} />
  }
  if (indicatorId === null) {
    return (
      <PanelScreen
        crewMember={crewMember}
        onOpenIndicator={setIndicatorId}
        onSwitchProfile={() => setCrewMember(null)}
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
