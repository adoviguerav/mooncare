// Run with: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeLimits } from '../src/lib/indicators.ts'

const RULE = { id: 1, title: 'A rule', explanation: '', action: '', threshold_source: '', baseline_direction: null, baseline_deviations: null }

test('a rule with two limits reads as a range', () => {
  assert.equal(describeLimits({ ...RULE, low: 65, high: 99 }, 'mg/dL'), '65 mg/dL to 99 mg/dL')
})

test('a rule with only a lower limit says the least allowed', () => {
  assert.equal(describeLimits({ ...RULE, low: 420, high: null }, 'min'), 'at least 7 h 00')
})

test('a rule with only an upper limit says the most allowed', () => {
  assert.equal(describeLimits({ ...RULE, low: null, high: 100 }, 'bpm'), 'at most 100 bpm')
})

test('a rule against the crew member\'s own usual value has no limits to print', () => {
  const rule = { ...RULE, low: null, high: null, baseline_direction: 'below', baseline_deviations: 3 }
  assert.equal(describeLimits(rule, '%'), 'well below your own usual value')
})
