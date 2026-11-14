// Creates the voice agent of the emergency guide in ElevenLabs, or updates it after a step changes.
// Its instructions are built from the procedure in src/lib/procedures.ts.
//
//   cd apps/web
//   node --env-file=../../services/api/.env scripts/create-emergency-agent.mjs
//
// ELEVENLABS_API_KEY is required. With ELEVENLABS_AGENT_ID set, that agent is updated; without it, a new
// one is created and its id printed: add it to services/api/.env as ELEVENLABS_AGENT_ID.
// ELEVENLABS_VOICE_ID is optional: without it, the voice is Brian, a male English voice.
import { PROCEDURE_BY_EVENT } from '../src/lib/procedures.ts'
import { GO_TO_STEP_TOOL, PRESENT, RECORD_FINDINGS_TOOL, VOICE_AGENT_EVENT, buildAgentPrompt } from '../src/lib/voiceAgent.ts'

const API = 'https://api.elevenlabs.io/v1'
// The same pace as the recorded audio. 1.2 is the fastest the API allows.
const SPEED = 1.2
const AGENT_NAME = 'Moon Care emergency guide'
const procedure = PROCEDURE_BY_EVENT[VOICE_AGENT_EVENT]

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

// "Brian - Deep, Resonant and Comforting": a male American English voice from the ElevenLabs default library
const DEFAULT_VOICE_ID = 'nPczCjzI2devNBz1zQrb'

function getVoiceId() {
  return process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID
}

const TOOLS = [
  {
    name: GO_TO_STEP_TOOL,
    description:
      'Moves the guide on the screen to another step of the procedure: forward, when the last action of the current step is confirmed or her answer matches one of its answers, or back to the step she came from. It returns the new step.',
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
  },
  {
    name: RECORD_FINDINGS_TOOL,
    description:
      'Writes into the report for the Surgeon what the medical officer has just told you: a symptom or sign the patient has, or a value of the form of the current step. She sees it on her screen.',
    parameters: {
      type: 'object',
      properties: {
        findings: {
          type: 'array',
          description: 'One entry per finding',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'The name exactly as written in the current step' },
              value: {
                type: 'string',
                description: `"${PRESENT}" for a symptom or sign the patient has, "absent" for one she does not have, or the value she read for a field of the form`,
              },
            },
            required: ['name', 'value'],
          },
        },
      },
      required: ['findings'],
    },
  },
]

async function createTools() {
  const toolIds = []
  for (const tool of TOOLS) {
    const created = await callApi('POST', '/convai/tools', {
      tool_config: { type: 'client', ...tool, expects_response: true, response_timeout_secs: 5 },
    })
    toolIds.push(created.id)
  }
  return toolIds
}

const agentId = process.env.ELEVENLABS_AGENT_ID
const voiceId = getVoiceId()
const toolIds = await createTools()
const agent = {
  // No fixed opening: the app tells the agent which step the guide is on, and the agent starts from there
  first_message: '',
  language: 'en',
  prompt: { prompt: buildAgentPrompt(procedure), temperature: 0, tool_ids: toolIds },
}
const tts = { voice_id: voiceId, speed: SPEED }
// She works in silence while she does each action: wait this many seconds before checking in
const turn = { turn_timeout: 20 }
const conversation_config = { agent, tts, turn }

if (agentId) {
  await callApi('PATCH', `/convai/agents/${agentId}`, { conversation_config })
  console.log(`Updated agent ${agentId}`)
} else {
  const created = await callApi('POST', '/convai/agents/create', {
    name: AGENT_NAME,
    conversation_config,
    // Private: a session needs a signed URL, which only the backend can ask for
    platform_settings: { auth: { enable_auth: true } },
  })
  console.log(`Created agent. Add this line to services/api/.env:\nELEVENLABS_AGENT_ID=${created.agent_id}`)
}
