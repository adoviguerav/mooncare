import { useEffect, useState } from 'react'

type ApiState<T> = { data: T | null; error: string | null }

export function useApi<T>(load: () => Promise<T>): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null })

  useEffect(() => {
    let cancelled = false
    load()
      .then((data) => {
        if (!cancelled) setState({ data, error: null })
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ data: null, error: error.message })
      })
    return () => {
      cancelled = true
    }
    // Loads once per mount: every screen is remounted when its crew member or indicator changes.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}
