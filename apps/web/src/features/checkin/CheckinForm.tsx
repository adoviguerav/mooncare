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

// shortcut: a bare form, enough to save a check-in; the real check-in screen (F2) replaces it
export function CheckinForm({ crewMemberId, date, moods, chosenToday, onSaved }: Props) {
  const [chosen, setChosen] = useState(chosenToday)
  const [error, setError] = useState<string | null>(null)

  function toggle(moodId: string) {
    setChosen(chosen.includes(moodId) ? chosen.filter((id) => id !== moodId) : [...chosen, moodId])
  }

  async function save() {
    try {
      await saveCheckin(crewMemberId, date, chosen as MoodId[])
      onSaved()
    } catch (saveError) {
      setError(`Could not save the check-in. ${(saveError as Error).message}`)
    }
  }

  return (
    <fieldset className="checkin">
      <legend>How are you today?</legend>
      {moods.map((mood) => (
        <label key={mood.id}>
          <input type="checkbox" checked={chosen.includes(mood.id)} onChange={() => toggle(mood.id)} />
          {mood.name}
        </label>
      ))}
      <button onClick={save}>Save check-in</button>
      {error !== null && <p role="alert">{error}</p>}
    </fieldset>
  )
}
