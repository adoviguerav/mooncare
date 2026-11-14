import { Icon } from '../../components/Icon.tsx'
import { Logo } from '../../components/Logo.tsx'
import { fetchCrew } from '../../lib/api.ts'
import type { CrewMember, CrewRole } from '../../lib/api.ts'
import { endEmergency, startEmergency, useEmergency } from '../../lib/emergency.ts'
import { useApi } from '../../hooks/useApi.ts'

const ROLE_NAMES: Record<CrewRole, string> = {
  commander: 'Commander',
  medical_officer: 'Medical officer',
  crew_member: 'Crew member',
}
// Who has the simulated cardiac event of the demo
const SIMULATED_PATIENT_NAME = 'Liam Novak'
const PLACEHOLDER_PROFILES = 4
// Each profile card comes in a little after the one before it
const PROFILE_STAGGER_MS = 60

type Props = { onPick: (crewMember: CrewMember) => void }

export function ProfilePicker({ onPick }: Props) {
  const { data: crew, error } = useApi(fetchCrew)
  const loading = crew === null && error === null
  const emergency = useEmergency()
  const patient = crew?.find((crewMember) => crewMember.name === SIMULATED_PATIENT_NAME)

  return (
    <main className="screen picker">
      <Logo height={200} />
      <p className="picker-tagline">A daily health panel for life beyond Earth</p>
      <section className="card picker-card">
        <div className="card-heading">
          <span className="icon-badge">
            <Icon name="users" />
          </span>
          <div>
            <h1>Who is checking in?</h1>
            <p className="muted">Choose your profile to open your own health panel.</p>
          </div>
        </div>
        {error !== null && <p role="alert">Could not load the crew. {error}</p>}
        <div className="profiles" aria-busy={loading}>
          {loading &&
            Array.from({ length: PLACEHOLDER_PROFILES }, (_, index) => (
              <div key={index} className="profile profile-placeholder" />
            ))}
          {crew?.map((crewMember, index) => (
            <button
              key={crewMember.id}
              className="profile"
              style={{ animationDelay: `${index * PROFILE_STAGGER_MS}ms` }}
              onClick={() => onPick(crewMember)}
            >
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
      {emergency !== null ? (
        <div className="simulation-banner" role="status">
          <span>Simulation running: cardiac alert for {emergency.patientName}. Open a profile to see it.</span>
          <button onClick={endEmergency}>End simulation</button>
        </div>
      ) : (
        patient !== undefined && (
          <button className="simulate" onClick={() => startEmergency(patient.id, patient.name)}>
            Simulate a cardiac event
          </button>
        )
      )}
    </main>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
}
