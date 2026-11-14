import { useConversation, useConversationClientTool } from '@elevenlabs/react'
import { useEffect, useRef, useState } from 'react'
import { createVoiceSession } from '../../lib/api.ts'
import { goToStep, recordFinding } from '../../lib/emergency.ts'
import type { Procedure, ProcedureStep } from '../../lib/procedures.ts'
import {
  GO_TO_STEP_TOOL,
  PRESENT,
  RECORD_FINDINGS_TOOL,
  describeStep,
  findNextStep,
  getRecordableNames,
} from '../../lib/voiceAgent.ts'

// starting: asking for the session. live: talking. off: turned off by hand.
// unavailable: no network, no key or the session dropped, so the recorded voice takes over.
export type VoiceAgentState = 'starting' | 'live' | 'off' | 'unavailable'

export type VoiceAgent = { state: VoiceAgentState; isSpeaking: boolean; toggle: () => void }

// The real-time voice of the guide: it talks with the medical officer and moves the guide when she answers.
// Must be used inside a ConversationProvider.
// `available` is false when the agent was not built for this procedure.
export function useVoiceAgent(
  procedure: Procedure,
  step: ProcedureStep,
  previousStepId: string | undefined,
  available: boolean,
): VoiceAgent {
  const [wanted, setWanted] = useState(available)
  const [failed, setFailed] = useState(false)
  const { status, isSpeaking, startSession, endSession, sendUserMessage } = useConversation()
  const stepRef = useRef(step)
  const previousStepIdRef = useRef(previousStepId)
  // The step the agent already knows about, so a tap on the screen is told to it and its own move is not.
  // Null until the conversation starts: the agent is then told where the guide is, and speaks first.
  const stepKnownToAgent = useRef<string | null>(null)

  // The SDK gives new start and end functions as the session changes. Kept in a ref so that a change
  // of theirs does not restart the conversation.
  const session = useRef({ startSession, endSession })

  useEffect(() => {
    stepRef.current = step
    previousStepIdRef.current = previousStepId
    session.current = { startSession, endSession }
  })

  useConversationClientTool(GO_TO_STEP_TOOL, (parameters) => {
    const current = stepRef.current
    const requested = typeof parameters.step_id === 'string' ? parameters.step_id : ''
    const next = findNextStep(procedure, current.id, requested, previousStepIdRef.current)
    if (next === undefined) {
      return `The guide did not move: "${requested}" is not an answer of the current step nor the step before.\n${describeStep(current)}`
    }
    stepKnownToAgent.current = next.id
    goToStep(next.id)
    return `The guide moved.\n${describeStep(next)}`
  })

  useConversationClientTool(RECORD_FINDINGS_TOOL, (parameters) => {
    const allowed = getRecordableNames(stepRef.current)
    const findings = Array.isArray(parameters.findings) ? parameters.findings : []
    const refused: string[] = []
    for (const finding of findings) {
      const { name, value } = finding as { name?: unknown; value?: unknown }
      if (typeof name !== 'string' || typeof value !== 'string' || !allowed.includes(name)) {
        refused.push(String(name))
        continue
      }
      const isTick = stepRef.current.record?.fields.includes(name) !== true
      recordFinding(name, isTick && value !== PRESENT ? null : value)
    }
    return refused.length === 0
      ? 'Recorded.'
      : `Not recorded, the current step does not list them: ${refused.join(', ')}. It lists: ${allowed.join('; ')}`
  })

  useEffect(() => {
    if (!wanted || !available) return
    let cancelled = false
    const giveUp = () => {
      if (!cancelled) setFailed(true)
    }
    createVoiceSession()
      .then((signedUrl) => {
        if (cancelled) return
        stepKnownToAgent.current = null
        session.current.startSession({
          signedUrl,
          onError: giveUp,
          onDisconnect: giveUp,
        })
      })
      .catch(giveUp)
    return () => {
      cancelled = true
      session.current.endSession()
    }
  }, [wanted, available])

  const isLive = wanted && !failed && status === 'connected'

  useEffect(() => {
    if (!isLive || step.id === stepKnownToAgent.current) return
    stepKnownToAgent.current = step.id
    sendUserMessage(`[screen] The guide is now on step "${step.id}".`)
  }, [isLive, step.id, sendUserMessage])

  const state: VoiceAgentState = !available ? 'unavailable' : !wanted ? 'off' : failed ? 'unavailable' : isLive ? 'live' : 'starting'
  const toggle = () => {
    setFailed(false)
    setWanted(!wanted || failed)
  }
  return { state, isSpeaking: isLive && isSpeaking, toggle }
}
