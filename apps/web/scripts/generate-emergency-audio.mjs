// Writes one MP3 per step of each emergency procedure into public/emergency, with ElevenLabs.
// The app plays these files, so it needs no key and no network during an emergency.
//
//   cd apps/web
//   node --env-file=../../services/api/.env scripts/generate-emergency-audio.mjs
//
// ELEVENLABS_API_KEY is required. ELEVENLABS_VOICE_ID is optional: without it, the first voice of the account.
import { writeFile } from 'node:fs/promises'
import { PROCEDURE_BY_EVENT, getAudioPath, getNarration } from '../src/lib/procedures.ts'

const API = 'https://api.elevenlabs.io/v1'
const MODEL_ID = 'eleven_multilingual_v2'
const OUTPUT_FORMAT = 'mp3_44100_128'

const apiKey = process.env.ELEVENLABS_API_KEY
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY is not set. Add it to services/api/.env.')
  process.exit(1)
}
const headers = { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }

async function getVoiceId() {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID
  const response = await fetch(`${API}/voices`, { headers })
  if (!response.ok) throw new Error(`Listing the voices returned ${response.status}`)
  const { voices } = await response.json()
  if (voices.length === 0) throw new Error('The account has no voices')
  console.log(`Voice: ${voices[0].name}`)
  return voices[0].voice_id
}

const voiceId = await getVoiceId()
for (const procedure of Object.values(PROCEDURE_BY_EVENT)) {
  for (const step of procedure.steps) {
    const response = await fetch(`${API}/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: getNarration(step), model_id: MODEL_ID }),
    })
    if (!response.ok) throw new Error(`${step.id}: text to speech returned ${response.status}`)
    const file = `public${getAudioPath(procedure, step)}`
    await writeFile(file, Buffer.from(await response.arrayBuffer()))
    console.log(`Wrote ${file}`)
  }
}
