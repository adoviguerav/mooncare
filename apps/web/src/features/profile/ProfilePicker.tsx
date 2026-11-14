import { fetchCrew } from '../../lib/api.ts'
import type { CrewMember, CrewRole } from '../../lib/api.ts'
import { useApi } from '../../hooks/useApi.ts'

const ROLE_NAMES: Record<CrewRole, string> = { commander: 'Commander', crew_member: 'Crew member' }

type Props = { onPick: (crewMember: CrewMember) => void }

export function ProfilePicker({ onPick }: Props) {
  const { data: crew, error } = useApi(fetchCrew)

  return (
    <main className="screen screen-centered">
      <h1>Real Telemetry</h1>
      <p className="muted">Who is checking in?</p>
      {error !== null && <p role="alert">Could not load the crew. {error}</p>}
      {crew === null && error === null && (
        <p className="muted">Loading the crew. The first visit can take up to a minute.</p>
      )}
      <div className="profiles">
        {crew?.map((crewMember) => (
          <button key={crewMember.id} className="profile" onClick={() => onPick(crewMember)}>
            {crewMember.name}
            <span className="muted">{ROLE_NAMES[crewMember.role]}</span>
          </button>
        ))}
      </div>
    </main>
  )
}
