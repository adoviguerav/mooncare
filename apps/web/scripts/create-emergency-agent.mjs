// Creates the voice agent of the emergency guide in ElevenLabs, or updates it after a step changes.
// Its instructions are built from the procedure in src/lib/procedures.ts.
//
//   cd apps/web
//   node --env-file=../../services/api/.env scripts/create-emergency-agent.mjs
//
// ELEVENLABS_API_KEY is required. With ELEVENLABS_AGENT_ID set, that agent is updated; without it, a new
// one is created and its id printed: add it to services/api/.env as ELEVENLABS_AGENT_ID.
// ELEVENLABS_VOICE_ID is optional: without it, the first voice of the account.
import { PROCEDURE_BY_EVENT } from '../src/lib/procedures.ts'
import { GO_TO_STEP_TOOL, OPENING_VARIABLE, buildAgentPrompt } from '../src/lib/voiceAgent.ts'

const API = 'https://api.elevenlabs.io/v1'
// The same pace as the recorded audio. 1.2 is the fastest the API allows.
const SPEED = 1.2
const AGENT_NAME = 'Moon Care emergency guide'
const procedure = PROCEDURE_BY_EVENT.cardiac

const apiKey = process.env.ELEVENLABS_API_KEY
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY is not set. Add it to services/api/.env.')
  process.exit(1)
}
const headers = { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }

async function callApi(method, path, body) {
  const response = await fetch(`${API}${path}`, { method, headers, body: body && JSON.stringify(body) })
  if (!response.ok) throw new Error(`${method} ${path} returned ${response.status}: ${await response.text()}`)
  return response.json()
}

async function getVoiceId() {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID
  const { voices } = await callApi('GET', '/voices')
  if (voices.length === 0) throw new Error('The account has no voices')
  console.log(`Voice: ${voices[0].name}`)
  return voices[0].voice_id
}

async function createGoToStepTool() {
  const tool = await callApi('POST', '/convai/tools', {
    tool_config: {
      type: 'client',
      name: GO_TO_STEP_TOOL,
      description:
        'Moves the guide on the screen to another step of the procedure. Call it when the answer of the medical officer matches one of the answers of the current step. It returns the new step.',
      parameters: {
        type: 'object',
        properties: {
          step_id: {
            type: 'string',
            description: 'The id of the step to move to, as written in the answers of the current step',
            enum: procedure.steps.map((step) => step.id),
          },
        },
        required: ['step_id'],
      },
      expects_response: true,
      response_timeout_secs: 5,
    },
  })
  return tool.id
}

const agentId = process.env.ELEVENLABS_AGENT_ID
const voiceId = await getVoiceId()
const agent = {
  // The first thing the agent says is the first instruction of the step the guide is on, sent by the app
  first_message: `{{${OPENING_VARIABLE}}}`,
  language: 'en',
  prompt: { prompt: buildAgentPrompt(procedure), temperature: 0 },
}
const tts = { voice_id: voiceId, speed: SPEED }

if (agentId) {
  await callApi('PATCH', `/convai/agents/${agentId}`, { conversation_config: { agent, tts } })
  console.log(`Updated agent ${agentId}`)
} else {
  const toolId = await createGoToStepTool()
  const created = await callApi('POST', '/convai/agents/create', {
    name: AGENT_NAME,
    conversation_config: { agent: { ...agent, prompt: { ...agent.prompt, tool_ids: [toolId] } }, tts },
    // Private: a session needs a signed URL, which only the backend can ask for
    platform_settings: { auth: { enable_auth: true } },
  })
  console.log(`Created agent. Add this line to services/api/.env:\nELEVENLABS_AGENT_ID=${created.agent_id}`)
}
