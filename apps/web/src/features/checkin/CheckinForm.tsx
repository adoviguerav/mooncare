import { useState } from 'react'
import { saveCheckin } from '../../lib/api.ts'
import type { MoodId, PanelIndicator } from '../../lib/api.ts'

type Props = {
  crewMemberId: number
  date: string
  moods: PanelIndicator[]
  chosenToday: string[]
  onSaved: () => void
}

export function CheckinForm({ crewMemberId, date, moods, chosenToday, onSaved }: Props) {
  const [chosen, setChosen] = useState(chosenToday)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(moodId: string) {
    setChosen(chosen.includes(moodId) ? chosen.filter((id) => id !== moodId) : [...chosen, moodId])
  }

  async function save() {
    setSaving(true)
    try {
      await saveCheckin(crewMemberId, date, chosen as MoodId[])
      onSaved()
    } catch (saveError) {
      setError(`Could not save the check-in. ${(saveError as Error).message}`)
      setSaving(false)
    }
  }

  return (
    <div className="checkin">
      <p className="muted">Choose every mood that fits. It stays private to you.</p>
      <div className="moods" role="group" aria-label="Your mood today">
        {moods.map((mood) => (
          <button
            key={mood.id}
            className="mood"
            aria-pressed={chosen.includes(mood.id)}
            onClick={() => toggle(mood.id)}
          >
            {mood.name}
          </button>
        ))}
      </div>
      <button className="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving' : 'Save check-in'}
      </button>
      {error !== null && <p role="alert">{error}</p>}
    </div>
  )
}
