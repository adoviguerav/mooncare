import { useCallback, useEffect, useState } from 'react'

export type Load<T> = { data: T | null; error: Error | null; loading: boolean; reload: () => void }

/** Runs `load` when its dependencies change, and keeps the last result while it reloads. */
export function useLoad<T>(load: () => Promise<T>, dependencies: unknown[]): Load<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, dependencies)

  useEffect(() => {
    let current = true
    setLoading(true)
    run()
      .then((result) => {
        if (current) {
          setData(result)
          setError(null)
        }
      })
      .catch((failure: unknown) => {
        if (current) setError(failure instanceof Error ? failure : new Error(String(failure)))
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [run, attempt])

  return { data, error, loading, reload: () => setAttempt((value) => value + 1) }
}
