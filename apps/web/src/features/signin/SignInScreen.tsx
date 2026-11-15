import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon.tsx'
import { Logo } from '../../components/Logo.tsx'
import { ApiError, fetchSignInUsers, signIn } from '../../lib/api.ts'
import type { Me, SignInUser } from '../../lib/api.ts'
import { useApi } from '../../hooks/useApi.ts'

const PIN_LENGTH = 6
const ROLE_NAMES: Record<string, string> = {
  commander: 'Commander',
  medical_officer: 'Medical officer',
  crew_member: 'Crew member',
  earth_admin: 'Earth administrator',
}
const PROFILE_STAGGER_MS = 60

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
}

/** The first screen of the dashboard: pick your name and type your PIN. The session lasts 10 days. */
export function SignInScreen({ onSignedIn }: { onSignedIn: (me: Me) => void }) {
  const { data: users, error } = useApi(fetchSignInUsers)
  const [chosen, setChosen] = useState<SignInUser | null>(null)
  const loading = users === null && error === null

  return (
    <main className="screen picker">
      <Logo height={200} />
      <p className="picker-tagline">A daily health panel for life beyond Earth</p>
      <section className="card picker-card">
        {chosen === null ? (
          <>
            <div className="card-heading">
              <span className="icon-badge">
                <Icon name="users" />
              </span>
              <div>
                <h1>Sign in</h1>
                <p className="muted">Choose your name, then type your PIN.</p>
              </div>
            </div>
            {error !== null && <p role="alert">Could not reach the base server. {error}</p>}
            {loading && <p className="muted">Connecting to the base server. The first visit can take up to a minute.</p>}
            {users !== null && users.length === 0 && (
              <p className="muted">There are no accounts on this server yet.</p>
            )}
            <div className="profiles">
              {users?.map((user, index) => (
                <button
                  key={user.id}
                  className="profile"
                  style={{ animationDelay: `${index * PROFILE_STAGGER_MS}ms` }}
                  onClick={() => setChosen(user)}
                >
                  <span className="avatar" aria-hidden="true">
                    {getInitials(user.display_name)}
                  </span>
                  <span className="profile-text">
                    <strong>{user.display_name}</strong>
                    <span className="muted">{ROLE_NAMES[user.role] ?? user.role}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <PinPad user={chosen} onBack={() => setChosen(null)} onSignedIn={onSignedIn} />
        )}
      </section>
    </main>
  )
}

function PinPad({ user, onBack, onSignedIn }: { user: SignInUser; onBack: () => void; onSignedIn: (me: Me) => void }) {
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(fullPin: string) {
    setBusy(true)
    setMessage('')
    try {
      onSignedIn(await signIn(user.id, fullPin))
    } catch (failure) {
      setPin('')
      setMessage(failure instanceof ApiError ? failure.message : 'The base server cannot be reached. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function press(digit: string) {
    if (busy || pin.length >= PIN_LENGTH) return
    const next = pin + digit
    setPin(next)
    setMessage('')
    if (next.length === PIN_LENGTH) void submit(next)
  }

  // A physical keyboard works too: digits type, Backspace deletes
  const pressRef = useRef(press)
  useEffect(() => {
    pressRef.current = press
  })
  useEffect(() => {
    const type = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) pressRef.current(event.key)
      else if (event.key === 'Backspace') setPin((current) => current.slice(0, -1))
    }
    window.addEventListener('keydown', type)
    return () => window.removeEventListener('keydown', type)
  }, [])

  return (
    <div className="pin">
      <button className="ghost ghost-small" onClick={onBack}>
        Change name
      </button>
      <div className="card-heading">
        <span className="avatar" aria-hidden="true">
          {getInitials(user.display_name)}
        </span>
        <div>
          <h1>{user.display_name}</h1>
          <p className="muted">Type your {PIN_LENGTH}-digit PIN.</p>
        </div>
      </div>
      <div className="pin-dots" role="status" aria-label={`${pin.length} of ${PIN_LENGTH} digits`}>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <i key={index} className={index < pin.length ? 'on' : undefined} />
        ))}
      </div>
      <p className="pin-message" role="alert">
        {busy ? 'Checking' : message}
      </p>
      <div className="pinpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button key={digit} disabled={busy} onClick={() => press(digit)}>
            {digit}
          </button>
        ))}
        <button className="fn" disabled={busy} onClick={() => setPin('')}>
          Clear
        </button>
        <button disabled={busy} onClick={() => press('0')}>
          0
        </button>
        <button className="fn" disabled={busy} aria-label="Delete last digit" onClick={() => setPin(pin.slice(0, -1))}>
          ⌫
        </button>
      </div>
      <p className="muted pin-note">You stay signed in on this device for 10 days.</p>
    </div>
  )
}
