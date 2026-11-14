import { useEffect, useRef, useState } from 'react'
import { ApiError, NetworkError, api } from '@mooncare/api'
import type { Me, SignInUser } from '@mooncare/api'
import { Logo } from '../components/Logo'
import { useLoad } from '../lib/useLoad'

const PIN_LENGTH = 6
const ROLE_LABEL: Record<string, string> = { commander: 'Commander', crew_member: 'Crew member' }

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** The first screen: pick your profile, type your PIN. The session then lasts 10 days. */
export function SignInScreen({ onSignedIn }: { onSignedIn: (me: Me) => void }) {
  const users = useLoad(() => api.signInUsers(), [])
  const [chosen, setChosen] = useState<SignInUser | null>(null)

  return (
    <main className="signin">
      <Logo className="logo" />
      <p className="tag2">A DAILY HEALTH PANEL FOR LIFE BEYOND EARTH</p>
      {chosen ? (
        <PinPanel user={chosen} onBack={() => setChosen(null)} onSignedIn={onSignedIn} />
      ) : (
        <div className="panel">
          <h2>Who’s checking in?</h2>
          <p className="sub">Choose your profile to open your own health panel.</p>
          {users.loading && !users.data && <p className="note">Connecting to the lunar base…</p>}
          {users.error && (
            <>
              <p className="err">
                {users.error instanceof NetworkError
                  ? 'The lunar base server cannot be reached. Check the base network.'
                  : users.error.message}
              </p>
              <button className="linkbtn" type="button" onClick={users.reload}>
                Try again
              </button>
            </>
          )}
          {users.data && users.data.users.length === 0 && (
            <p className="note">No crew profiles on this base yet. They arrive with the next sync with Earth.</p>
          )}
          <div className="cgrid">
            {users.data?.users.map((user, index) => (
              <button key={user.id} className="cm" type="button" style={{ animationDelay: `${index * 0.06}s` }} onClick={() => setChosen(user)}>
                <span className="av" aria-hidden="true">
                  {initials(user.display_name)}
                </span>
                <span>
                  <b>{user.display_name}</b>
                  <small>{ROLE_LABEL[user.role] ?? user.role}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

function PinPanel({ user, onBack, onSignedIn }: { user: SignInUser; onBack: () => void; onSignedIn: (me: Me) => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(fullPin: string) {
    setBusy(true)
    setError('')
    try {
      const { user: me } = await api.login(user.id, fullPin)
      onSignedIn(me)
    } catch (failure) {
      setPin('')
      if (failure instanceof ApiError) setError(failure.message)
      else if (failure instanceof NetworkError) setError('The lunar base server cannot be reached.')
      else setError('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function press(digit: string) {
    if (busy || pin.length >= PIN_LENGTH) return
    const next = pin + digit
    setPin(next)
    setError('')
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
    <div className="panel">
      <button className="back" type="button" onClick={onBack}>
        ← Change profile
      </button>
      <h2 style={{ marginTop: 8 }}>{user.display_name}</h2>
      <p className="sub">Type your {PIN_LENGTH}-digit PIN.</p>
      <div className="pin-dots" aria-label={`${pin.length} of ${PIN_LENGTH} digits`} role="status">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <i key={index} className={index < pin.length ? 'on' : undefined} />
        ))}
      </div>
      <p className="err" role="alert">
        {busy ? 'Checking…' : error}
      </p>
      <div className="pinpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button key={digit} type="button" onClick={() => press(digit)} disabled={busy}>
            {digit}
          </button>
        ))}
        <button className="fn" type="button" onClick={() => setPin('')} disabled={busy}>
          Clear
        </button>
        <button type="button" onClick={() => press('0')} disabled={busy}>
          0
        </button>
        <button className="fn" type="button" aria-label="Delete last digit" onClick={() => setPin(pin.slice(0, -1))} disabled={busy}>
          ⌫
        </button>
      </div>
      <p className="note stay">You stay signed in on this device for 10 days.</p>
    </div>
  )
}
