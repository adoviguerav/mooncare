import { useState } from 'react'
import { saveCheckin } from '../../lib/api.ts'
import type { MoodId } from '../../lib/api.ts'

// shortcut: a bare form to check the check-in endpoint from the app, replace it with the real check-in screen (F2)
const MOODS: { id: MoodId; label: string }[] = [
  { id: 'mood_happy', label: 'Happy' },
  { id: 'mood_sad', label: 'Sad' },
  { id: 'mood_tense', label: 'Tense or anxious' },
  { id: 'mood_alert', label: 'Alert' },
  { id: 'mood_rested', label: 'Rested or relaxed' },
  { id: 'mood_neutral', label: 'Neutral' },
]

type Props = { crewMemberId: number; date: string; onSaved: () => void }

export function CheckinForm({ crewMemberId, date, onSaved }: Props) {
  const [chosen, setChosen] = useState<MoodId[]>([])
  const [status, setStatus] = useState<string | null>(null)

  function toggle(moodId: MoodId) {
    setChosen(chosen.includes(moodId) ? chosen.filter((id) => id !== moodId) : [...chosen, moodId])
  }

  async function save() {
    try {
      const saved = await saveCheckin(crewMemberId, date, chosen)
      setStatus(`Saved for ${saved.date}: ${saved.moods.join(', ') || 'no mood chosen'}`)
      onSaved()
    } catch (error) {
      setStatus(`Could not save the check-in. ${(error as Error).message}`)
    }
  }

  return (
    <fieldset className="checkin">
      <legend>Daily check-in</legend>
      {MOODS.map((mood) => (
        <label key={mood.id}>
          <input type="checkbox" checked={chosen.includes(mood.id)} onChange={() => toggle(mood.id)} />
          {mood.label}
        </label>
      ))}
      <button onClick={save}>Save check-in</button>
      {status !== null && <p role="status">{status}</p>}
    </fieldset>
  )
}
