// Run with: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeHydration, getHydrationTag } from '../src/features/wellbeing/hydration.ts'

const GOAL = { ml: 2000, total_water_ml: 2500, drinks_share: 0.8, source: 'A reference' }
// Half of the day between 07:00 and 22:00: the fountain should hold 1000 ml of a 2000 ml goal
const HALF_DAY = new Date(2021, 10, 2, 14, 30)

const dayWith = (totalMl, goal = GOAL) => ({ date: '2021-11-02', goal, total_ml: totalMl, drinks: [], full_days_in_a_row: 0 })

test('a profile with no goal is tagged as having none', () => {
  assert.deepEqual(getHydrationTag(dayWith(700, null), HALF_DAY), { tone: 'ok', label: 'No goal' })
})

test('a total at the goal is tagged as reached', () => {
  assert.deepEqual(getHydrationTag(dayWith(2000), HALF_DAY), { tone: 'ok', label: 'Goal reached' })
})

test('more than 300 ml under the pace is tagged as behind', () => {
  assert.deepEqual(getHydrationTag(dayWith(600), HALF_DAY), { tone: 'alert', label: 'Behind pace' })
})

test('a total near the pace is tagged as on pace', () => {
  assert.deepEqual(getHydrationTag(dayWith(800), HALF_DAY), { tone: 'ok', label: 'On pace' })
})

test('more than 500 ml over the pace is tagged as ahead', () => {
  assert.deepEqual(getHydrationTag(dayWith(1600), HALF_DAY), { tone: 'ok', label: 'Ahead of pace' })
})

test('an empty fountain is described with its goal in litres', () => {
  assert.equal(describeHydration(dayWith(0), HALF_DAY), 'Fill the fountain with today’s water. Your goal is 2.0 L.')
})

test('a fountain behind the pace is described with what is left and a nudge', () => {
  assert.equal(describeHydration(dayWith(600), HALF_DAY), '30% full. 1400 ml to go. A drink now will catch you up.')
})

test('a total well past the goal is described with a warning', () => {
  assert.equal(
    describeHydration(dayWith(2700), HALF_DAY),
    'You are well past today’s goal. More is not better. Ask the flight surgeon if you are still thirsty.',
  )
})
