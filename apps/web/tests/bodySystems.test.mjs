// Run with: npm test
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { BODY_SYSTEMS, getBodySystemStates } from '../src/lib/bodySystems.ts'
import { MOOD_ORDER } from '../src/lib/groups.ts'

const RULE = { id: 7, title: 'High', explanation: 'It is high.', action: 'Rest.' }

const indicator = (id, value, brokenRule = null) => ({
  id,
  name: id,
  unit: null,
  reading: value === null ? null : { taken_at: '2021-11-02T00:00', value },
  measured_by: 'sensor',
  cadence_days: 1,
  due: false,
  broken_rule: brokenRule,
})

const stateOf = (states, systemId) => states.find((state) => state.system.id === systemId)

test('a system whose readings break no rule is fine', () => {
  const states = getBodySystemStates([indicator('heart_rate', 62), indicator('spo2', 97)])

  assert.equal(stateOf(states, 'heart').status, 'ok')
  assert.equal(stateOf(states, 'heart').alertCount, 0)
})

test('a system needs a look when one of its readings breaks a rule', () => {
  const states = getBodySystemStates([indicator('heart_rate', 62), indicator('spo2', 89, RULE)])

  assert.equal(stateOf(states, 'heart').status, 'alert')
  assert.equal(stateOf(states, 'heart').alertCount, 1)
})

test('a system with no reading at all has no state', () => {
  const states = getBodySystemStates([indicator('glucose', null), indicator('heart_rate', 62)])

  assert.equal(stateOf(states, 'metabolism').status, null)
})

test('an alert in one system leaves the others as they are', () => {
  const states = getBodySystemStates([indicator('crp', 12, RULE), indicator('steps', 4000)])

  assert.equal(stateOf(states, 'immune').status, 'alert')
  assert.equal(stateOf(states, 'bones').status, 'ok')
  assert.equal(stateOf(states, 'brain').status, null)
})

test('a system lists its parameters in the order of its groups, not of the panel', () => {
  const states = getBodySystemStates([indicator('sleep_duration', 420), indicator('stress_score', 70)])

  assert.deepEqual(
    stateOf(states, 'brain').indicators.map((item) => item.id),
    ['stress_score', 'sleep_duration'],
  )
})

test('a parameter no group knows goes to metabolism, so none is lost', () => {
  const states = getBodySystemStates([indicator('a_new_blood_test', 3)])

  assert.deepEqual(
    stateOf(states, 'metabolism').indicators.map((item) => item.id),
    ['a_new_blood_test'],
  )
})

test('the six systems come in the order of the map', () => {
  assert.deepEqual(
    getBodySystemStates([]).map((state) => state.system.title),
    ['Brain and mind', 'Heart and lungs', 'Immune system', 'Radiation', 'Metabolism', 'Bones and muscle'],
  )
})

test('every parameter the database defines, apart from the check-in moods, is in exactly one system', () => {
  const seed = readFileSync(new URL('../../../database/postgresql/seeds/11_cfg_indicators.sql', import.meta.url), 'utf8')
  const seededIds = [...seed.matchAll(/^\s*\('([a-z0-9_]+)'/gm)].map((match) => match[1])
  const mappedIds = BODY_SYSTEMS.flatMap((system) => system.indicatorIds)

  assert.ok(seededIds.length > 0, 'no indicator was read from the seed')
  for (const id of seededIds.filter((seededId) => !MOOD_ORDER.includes(seededId))) {
    assert.equal(mappedIds.filter((mappedId) => mappedId === id).length, 1, id)
  }
})
