import { Icon } from '../../components/Icon.tsx'
import { Logo } from '../../components/Logo.tsx'
import { fetchCrew } from '../../lib/api.ts'
import type { CrewMember, CrewRole, Me } from '../../lib/api.ts'
import { endEmergency, findSimulatedPatient, startEmergency, useEmergency } from '../../lib/emergency.ts'
import { useApi } from '../../hooks/useApi.ts'

const ROLE_NAMES: Record<CrewRole, string> = {
  commander: 'Commander',
  medical_officer: 'Medical officer',
  crew_member: 'Crew member',
}
const PLACEHOLDER_PROFILES = 4
const PROFILE_STAGGER_MS = 60

// me is null when the server has no accounts yet and the dashboard opens with no sign-in
type Props = { me: Me | null; onPick: (crewMember: CrewMember) => void; onSignOut: () => void }

export function ProfilePicker({ me, onPick, onSignOut }: Props) {
  const { data: crew, error } = useApi(fetchCrew)
  const loading = crew === null && error === null
  const emergency = useEmergency()
  const patient = crew == null ? undefined : findSimulatedPatient(crew)

  return (
    <main className="screen picker">
      <Logo height={200} />
      <p className="picker-tagline">A daily health panel for life beyond Earth</p>
      {me !== null && (
        <div className="signed-in">
          <span>
            Signed in as <strong>{me.display_name}</strong>
            {me.role in ROLE_NAMES ? ` · ${ROLE_NAMES[me.role as CrewRole]}` : ''}
          </span>
          <button className="ghost ghost-small" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
      <section className="card picker-card">
        <div className="card-heading">
          <span className="icon-badge">
            <Icon name="users" />
          </span>
          <div>
            <h1>{me === null ? 'Who is checking in?' : 'Whose panel?'}</h1>
            <p className="muted">
              {me === null
                ? 'Choose your profile to open your own health panel.'
                : 'You see the whole crew. Choose a crew member to open their health panel.'}
            </p>
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
          <span>Simulation running: an alert for {emergency.patientName}. Open a profile to see it.</span>
          <button className="ghost ghost-small" onClick={endEmergency}>
            End simulation
          </button>
        </div>
      ) : (
        patient !== undefined && (
          <button className="ghost simulate" onClick={() => startEmergency('infection', patient.id, patient.name)}>
            Simulate a possible infection
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
