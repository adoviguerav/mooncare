import { fetchCrew } from '../../lib/api.ts'
import type { CrewMember } from '../../lib/api.ts'
import { useApi } from '../../hooks/useApi.ts'

type Props = { onPick: (crewMember: CrewMember) => void }

export function ProfilePicker({ onPick }: Props) {
  const { data: crew, error } = useApi(fetchCrew)

  return (
    <main className="screen screen-centered">
      <h1>Real Telemetry</h1>
      <p className="muted">Who is checking in?</p>
      {error !== null && <p role="alert">Could not load the crew. {error}</p>}
      <div className="profiles">
        {crew?.map((crewMember) => (
          <button key={crewMember.id} className="profile" onClick={() => onPick(crewMember)}>
            {crewMember.name}
          </button>
        ))}
      </div>
    </main>
  )
}
