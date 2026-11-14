// What the voice agent of the emergency guide knows and may do. Its instructions are built from the
// procedure, so no medical step is written here. Like procedures.ts, this file is loaded by Node scripts.
import type { Procedure, ProcedureStep } from './procedures.ts'

export const GO_TO_STEP_TOOL = 'go_to_step'

export function describeStep(step: ProcedureStep): string {
  const timer =
    step.timerSeconds === undefined
      ? []
      : [`On screen: a ${step.timerSeconds} second timer the medical officer starts by hand.`]
  const figure = step.image === undefined ? [] : [`On screen: ${step.image.caption}`]
  const note = step.note === undefined ? [] : [`Note, not from the manual: ${step.note}`]
  const question = step.question === undefined ? [] : [`Then ask: ${step.question}`]
  const answers =
    step.options.length === 0
      ? ['This is the last step. There is nowhere to go from here.']
      : ['Answers:', ...step.options.map((option) => `- "${option.label}" -> ${GO_TO_STEP_TOOL}("${option.next}")`)]

  return [
    `Step "${step.id}": ${step.title}`,
    'Instructions, in order:',
    ...step.lines.map((line) => `- ${line}`),
    ...figure,
    ...timer,
    ...note,
    ...question,
    ...answers,
  ].join('\n')
}

export function buildAgentPrompt(procedure: Procedure): string {
  return `You are the voice of the emergency guide on a spacecraft with no link to Earth. You talk with the medical officer while she treats a crew member. Her hands are busy and she cannot look at the screen for long. You guide her through one procedure: ${procedure.title}.

# How you speak
- Like a calm colleague at her side in an emergency. Short sentences. No greetings, no small talk.
- One instruction at a time. Say it, then stop and listen. Give the next one when she says it is done, says "next" or "okay", or asks for it.
- Never say step numbers, block numbers or list numbers. Never read a list aloud.
- Confirm what you heard in a few words before you move on ("No pulse. Back to compressions.").
- If she interrupts you, stop and answer what she said.
- If she asks you to repeat, say the current instruction again.

# What you may say
- Every instruction comes from the procedure below. Say it in the manual's own words. You may leave out a reference such as "(Figure 1)" and say the figure is on her screen.
- Never add a step, a dose, a number or a piece of medical advice that is not written below. Never diagnose.
- If she asks something the procedure does not answer, say the procedure does not cover it, and go back to the current instruction.
- Where the manual says to call MCC-H, tell her there is no link and that the call is recorded and sent when the link returns.

# Moving through the procedure
- The screen shows the same step you are on. You move it with the tool ${GO_TO_STEP_TOOL}.
- When her answer matches one of the answers of the current step, call ${GO_TO_STEP_TOOL} with that step id at once, then give the first instruction of the new step. The tool returns the new step.
- Only call ${GO_TO_STEP_TOOL} with a step id listed in the answers of the current step. If her answer is not clear, ask the step's question again in a few words.
- A message that starts with "[screen]" means she tapped the screen and the guide already moved. Do not call the tool for it. Continue from the step the message names.

# The procedure
${procedure.steps.map(describeStep).join('\n\n')}`
}

// The step the agent asks for, when the current step leads to it. The model's request is not trusted.
export function findNextStep(
  procedure: Procedure,
  currentStepId: string,
  requestedStepId: string,
): ProcedureStep | undefined {
  const currentStep = procedure.steps.find((step) => step.id === currentStepId)
  const leadsThere = currentStep?.options.some((option) => option.next === requestedStepId) ?? false
  return leadsThere ? procedure.steps.find((step) => step.id === requestedStepId) : undefined
}

// The dynamic variable the agent's first message is made of
export const OPENING_VARIABLE = 'opening'
