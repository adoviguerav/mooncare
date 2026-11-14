// Run with: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AED_ASSISTED_CPR } from '../src/lib/procedures.ts'
import { buildAgentPrompt, describeStep, findNextStep } from '../src/lib/voiceAgent.ts'

test('the agent prompt carries every line of the manual, word for word', () => {
  const prompt = buildAgentPrompt(AED_ASSISTED_CPR)

  for (const step of AED_ASSISTED_CPR.steps) {
    for (const line of step.lines) assert.ok(prompt.includes(line), `missing line: ${line}`)
  }
})

test('the agent prompt says which step each answer leads to', () => {
  const prompt = buildAgentPrompt(AED_ASSISTED_CPR)

  assert.ok(prompt.includes('"Patient unresponsive and breathing normally" -> go_to_step("transport")'))
  assert.ok(prompt.includes('"No" -> go_to_step("cpr-until-prompted")'))
})

test('a step is described with its lines, its question and its choices', () => {
  const monitor = AED_ASSISTED_CPR.steps.find((step) => step.id === 'monitor')

  assert.equal(
    describeStep(monitor),
    [
      'Step "monitor": Monitor patient response',
      'Instructions, in order:',
      "- After AED prompts 'Start CPR', perform a 10-second pulse check.",
      'On screen: a 10 second timer the medical officer starts by hand.',
      'Then ask: Is pulse detected?',
      'Answers:',
      '- "Yes" -> go_to_step("assist")',
      '- "No" -> go_to_step("cpr-until-prompted")',
    ].join('\n'),
  )
})

test('the agent can move to a step the current one leads to', () => {
  const next = findNextStep(AED_ASSISTED_CPR, 'monitor', 'assist')

  assert.equal(next?.id, 'assist')
})

test('the agent cannot jump to a step the current one does not lead to', () => {
  assert.equal(findNextStep(AED_ASSISTED_CPR, 'assess', 'handover'), undefined)
  assert.equal(findNextStep(AED_ASSISTED_CPR, 'assess', 'not-a-step'), undefined)
})
