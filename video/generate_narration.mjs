// Writes the narration of the demo video with ElevenLabs: one MP3 per line of narration.json, into OUT_DIR.
// build_video.py lays them over the picture at the `start` of each line.
//
//   node --env-file=services/api/.env video/generate_narration.mjs OUT_DIR [LINE_NUMBER ...]
//
// With line numbers it speaks only those lines again, and leaves the other files as they are.
// ELEVENLABS_API_KEY is required. NARRATOR_VOICE_ID is optional.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const API = 'https://api.elevenlabs.io/v1'
const MODEL_ID = 'eleven_multilingual_v2'
const OUTPUT_FORMAT = 'mp3_44100_128'
// "Sarah", a female voice of the ElevenLabs default library. Not the voice of the guide in the app (Brian),
// so the narrator and the guide are not taken for the same thing.
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'
// Normal speech. Between 0.7 and 1.2, the range the API allows.
const SPEED = Number(process.env.NARRATION_SPEED ?? 1)

const apiKey = process.env.ELEVENLABS_API_KEY
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY is not set. Add it to services/api/.env.')
  process.exit(1)
}
const outDir = process.argv[2]
if (!outDir) {
  console.error('Usage: node --env-file=services/api/.env video/generate_narration.mjs OUT_DIR')
  process.exit(1)
}
const voiceId = process.env.NARRATOR_VOICE_ID || DEFAULT_VOICE_ID
const lines = JSON.parse(await readFile(path.join(import.meta.dirname, 'narration.json'), 'utf8'))

const onlyLines = process.argv.slice(3).map(Number)

await mkdir(outDir, { recursive: true })
for (const [index, line] of lines.entries()) {
  if (onlyLines.length > 0 && !onlyLines.includes(index + 1)) continue
  const response = await fetch(`${API}/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: line.text, model_id: MODEL_ID, voice_settings: { speed: SPEED } }),
  })
  if (!response.ok) throw new Error(`Line ${index + 1}: text to speech returned ${response.status}: ${await response.text()}`)
  const file = path.join(outDir, `${index + 1}.mp3`)
  await writeFile(file, Buffer.from(await response.arrayBuffer()))
  console.log(`Wrote ${file}`)
}
