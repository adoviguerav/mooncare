import { useConversation, useConversationClientTool } from '@elevenlabs/react'
import { useEffect, useRef, useState } from 'react'
import { createVoiceSession } from '../../lib/api.ts'
import { goToStep } from '../../lib/emergency.ts'
import type { Procedure, ProcedureStep } from '../../lib/procedures.ts'
import { GO_TO_STEP_TOOL, OPENING_VARIABLE, describeStep, findNextStep } from '../../lib/voiceAgent.ts'

// starting: asking for the session. live: talking. off: turned off by hand.
// unavailable: no network, no key or the session dropped, so the recorded voice takes over.
export type VoiceAgentState = 'starting' | 'live' | 'off' | 'unavailable'

export type VoiceAgent = { state: VoiceAgentState; isSpeaking: boolean; toggle: () => void }

// The real-time voice of the guide: it talks with the medical officer and moves the guide when she answers.
// Must be used inside a ConversationProvider.
export function useVoiceAgent(procedure: Procedure, step: ProcedureStep): VoiceAgent {
  const [wanted, setWanted] = useState(true)
  const [failed, setFailed] = useState(false)
  const { status, isSpeaking, startSession, endSession, sendUserMessage } = useConversation()
  const stepRef = useRef(step)
  // The step the agent already knows about, so a tap on the screen is told to it and its own move is not
  const stepKnownToAgent = useRef(step.id)

  useEffect(() => {
    stepRef.current = step
  }, [step])

  useConversationClientTool(GO_TO_STEP_TOOL, (parameters) => {
    const current = stepRef.current
    const requested = typeof parameters.step_id === 'string' ? parameters.step_id : ''
    const next = findNextStep(procedure, current.id, requested)
    if (next === undefined) {
      return `The guide did not move: "${requested}" is not an answer of the current step.\n${describeStep(current)}`
    }
    stepKnownToAgent.current = next.id
    goToStep(next.id)
    return `The guide moved.\n${describeStep(next)}`
  })

  useEffect(() => {
    if (!wanted) return
    let cancelled = false
    const giveUp = () => {
      if (!cancelled) setFailed(true)
    }
    createVoiceSession()
      .then((signedUrl) => {
        if (cancelled) return
        stepKnownToAgent.current = stepRef.current.id
        startSession({
          signedUrl,
          dynamicVariables: { [OPENING_VARIABLE]: stepRef.current.lines[0] },
          onError: giveUp,
          onDisconnect: giveUp,
        })
      })
      .catch(giveUp)
    return () => {
      cancelled = true
      endSession()
    }
  }, [wanted, startSession, endSession])

  const isLive = wanted && !failed && status === 'connected'

  useEffect(() => {
    if (!isLive || step.id === stepKnownToAgent.current) return
    stepKnownToAgent.current = step.id
    sendUserMessage(`[screen] I tapped the screen. The guide is now on step "${step.id}".`)
  }, [isLive, step.id, sendUserMessage])

  const state: VoiceAgentState = !wanted ? 'off' : failed ? 'unavailable' : isLive ? 'live' : 'starting'
  const toggle = () => {
    setFailed(false)
    setWanted(!wanted || failed)
  }
  return { state, isSpeaking: isLive && isSpeaking, toggle }
}
