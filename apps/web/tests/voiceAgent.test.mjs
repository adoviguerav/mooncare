// Run with: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AED_ASSISTED_CPR, BLADDER_KIDNEY_INFECTION, PROCEDURE_BY_EVENT } from '../src/lib/procedures.ts'
import { buildAgentPrompt, describeStep, findNextStep, getRecordableNames } from '../src/lib/voiceAgent.ts'

test('the agent prompt carries every line of the manual, word for word', () => {
  for (const procedure of Object.values(PROCEDURE_BY_EVENT)) {
    const prompt = buildAgentPrompt(procedure)

    for (const step of procedure.steps) {
      for (const line of step.lines) assert.ok(prompt.includes(line), `missing line: ${line}`)
    }
  }
})

test('every answer of every procedure leads to a step that exists', () => {
  for (const procedure of Object.values(PROCEDURE_BY_EVENT)) {
    const stepIds = procedure.steps.map((step) => step.id)

    assert.ok(stepIds.includes(procedure.firstStepId))
    for (const step of procedure.steps) {
      for (const option of step.options) assert.ok(stepIds.includes(option.next), `${step.id} -> ${option.next}`)
    }
  }
})

test('a step with a form and drug entries tells the agent what is on the screen', () => {
  const urinalysis = BLADDER_KIDNEY_INFECTION.steps.find((step) => step.id === 'urinalysis')
  const antibiotics = BLADDER_KIDNEY_INFECTION.steps.find((step) => step.id === 'antibiotics')

  assert.ok(
    describeStep(urinalysis).includes(
      'On screen, a form to fill in: Urinalysis (CHEMSTRIP 10SG): SpG, pH, Leuk, Nit, Protein (mg/dL), Glucose (mg/dL), Ketones, Urobilinogen (mg/dL), Bilirubin, Blood, Hemoglobin (Ery/uL)',
    ),
  )
  const described = describeStep(antibiotics)
  assert.ok(described.includes('Read one only when she names it'))
  assert.ok(
    described.includes(
      '- *Duricef (Cefadroxil) (P1-A18,19). Dose: 1 capsule 2 times/day for 10 days. WARNING: Do not use if there is history of Penicillin or Cephalosporin allergy. Possible side effects: Diarrhea, nausea, vomiting, abdominal pain, rash.',
    ),
  )
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

test('the agent can go back to the step the medical officer came from', () => {
  const previous = findNextStep(BLADDER_KIDNEY_INFECTION, 'urinalysis', 'unstow', 'unstow')

  assert.equal(previous?.id, 'unstow')
})

test('the agent cannot go back to a step that is not the one before', () => {
  assert.equal(findNextStep(BLADDER_KIDNEY_INFECTION, 'urinalysis', 'symptoms', 'unstow'), undefined)
})

test('the agent may record the symptoms and signs of the step it is on, and nothing else', () => {
  const symptoms = BLADDER_KIDNEY_INFECTION.steps.find((step) => step.id === 'symptoms')

  const names = getRecordableNames(symptoms)

  assert.ok(names.includes('Painful urination'))
  assert.ok(names.includes('Cloudy or bloody urine'))
  assert.ok(!names.includes('Leuk'))
})

test('the agent may record which drug of the step was given', () => {
  const antibiotics = BLADDER_KIDNEY_INFECTION.steps.find((step) => step.id === 'antibiotics')

  assert.ok(getRecordableNames(antibiotics).includes('*Cipro (Ciprofloxacin, Oral) (P1-A7)'))
})

test('the agent may record the values of the form of the step it is on', () => {
  const urinalysis = BLADDER_KIDNEY_INFECTION.steps.find((step) => step.id === 'urinalysis')

  assert.deepEqual(getRecordableNames(urinalysis).slice(0, 3), ['SpG', 'pH', 'Leuk'])
})

test('the agent is told the symptoms to ask about, word for word', () => {
  const symptoms = BLADDER_KIDNEY_INFECTION.steps.find((step) => step.id === 'symptoms')

  assert.ok(describeStep(symptoms).includes("- Symptoms: Painful urination; Bladder spasms; Feeling of 'heaviness' in groin;"))
})

test('the agent cannot jump to a step the current one does not lead to', () => {
  assert.equal(findNextStep(AED_ASSISTED_CPR, 'assess', 'handover'), undefined)
  assert.equal(findNextStep(AED_ASSISTED_CPR, 'assess', 'not-a-step'), undefined)
})
