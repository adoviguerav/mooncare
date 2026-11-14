import { useEffect, useState } from 'react'
import { ApiError, NetworkError, api } from '@mooncare/api'
import type { Me } from '@mooncare/api'
import { CrewApp } from './screens/CrewApp'
import { SignInScreen } from './screens/SignInScreen'
import { clearDeviceCopies } from './lib/offline'

// Who was signed in last on this device, to open the saved panel when the server cannot be reached. Not a
// secret: the session itself is the HttpOnly cookie, which this code never sees.
const ME_KEY = 'mooncare.me'

function rememberMe(me: Me | null): void {
  try {
    if (me) localStorage.setItem(ME_KEY, JSON.stringify(me))
    else localStorage.removeItem(ME_KEY)
  } catch {
    // storage unavailable: offline start will not work, everything else does
  }
}

function rememberedMe(): Me | null {
  try {
    const stored = localStorage.getItem(ME_KEY)
    return stored ? (JSON.parse(stored) as Me) : null
  } catch {
    return null
  }
}

type State =
  | { kind: 'checking' }
  | { kind: 'signed-out' }
  | { kind: 'signed-in'; me: Me; offline: boolean }
  | { kind: 'unreachable' }

export function App() {
  const [state, setState] = useState<State>({ kind: 'checking' })

  useEffect(() => {
    api
      .me()
      .then((me) => {
        rememberMe(me)
        setState({ kind: 'signed-in', me, offline: false })
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          rememberMe(null)
          setState({ kind: 'signed-out' })
        } else if (error instanceof NetworkError) {
          const me = rememberedMe()
          setState(me ? { kind: 'signed-in', me, offline: true } : { kind: 'unreachable' })
        } else {
          setState({ kind: 'signed-out' })
        }
      })
  }, [])

  async function signOut() {
    try {
      await api.logout()
    } catch {
      // already signed out, or offline: the cookie expires on its own and the copies are cleared below
    }
    rememberMe(null)
    clearDeviceCopies()
    setState({ kind: 'signed-out' })
  }

  switch (state.kind) {
    case 'checking':
      return <p className="signin note">Connecting to the lunar base…</p>
    case 'unreachable':
      return (
        <main className="signin">
          <p className="err">The lunar base server cannot be reached, and nobody has signed in on this device yet.</p>
          <button className="linkbtn" type="button" style={{ maxWidth: 320 }} onClick={() => window.location.reload()}>
            Try again
          </button>
        </main>
      )
    case 'signed-out':
      return (
        <SignInScreen
          onSignedIn={(me) => {
            rememberMe(me)
            setState({ kind: 'signed-in', me, offline: false })
          }}
        />
      )
    case 'signed-in':
      return (
        <CrewApp
          me={state.me}
          startedOffline={state.offline}
          onSessionEnded={() => {
            rememberMe(null)
            setState({ kind: 'signed-out' })
          }}
          onSignOut={signOut}
        />
      )
  }
}
