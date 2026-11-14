import { Logo } from '../../components/Logo.tsx'
import { fetchCrew } from '../../lib/api.ts'
import type { CrewMember, CrewRole } from '../../lib/api.ts'
import { useApi } from '../../hooks/useApi.ts'

const ROLE_NAMES: Record<CrewRole, string> = { commander: 'Commander', crew_member: 'Crew member' }
const PLACEHOLDER_PROFILES = 4

type Props = { onPick: (crewMember: CrewMember) => void }

export function ProfilePicker({ onPick }: Props) {
  const { data: crew, error } = useApi(fetchCrew)
  const loading = crew === null && error === null

  return (
    <main className="screen picker">
      <Logo height={132} />
      <p className="picker-tagline">A daily health panel for life beyond Earth</p>
      <section className="card picker-card">
        <h1>Who is checking in?</h1>
        <p className="muted">Choose your profile to open your own health panel.</p>
        {error !== null && <p role="alert">Could not load the crew. {error}</p>}
        <div className="profiles" aria-busy={loading}>
          {loading &&
            Array.from({ length: PLACEHOLDER_PROFILES }, (_, index) => (
              <div key={index} className="profile profile-placeholder" />
            ))}
          {crew?.map((crewMember) => (
            <button key={crewMember.id} className="profile" onClick={() => onPick(crewMember)}>
              <span className="avatar" aria-hidden="true">
                {getInitials(crewMember.name)}
              </span>
              <span className="profile-text">
                <strong>{crewMember.name}</strong>
                <span className="muted">{ROLE_NAMES[crewMember.role]}</span>
              </span>
            </button>
          ))}
        </div>
        {loading && <p className="muted">Loading the crew. The first visit can take up to a minute.</p>}
      </section>
    </main>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
}
