// Run with: npm test
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { GROUPS } from '../src/lib/groups.ts'
import { INFECTION_SIGNALS } from '../src/lib/infectionSignals.ts'
import { LEARN_NOTES } from '../src/lib/learn.ts'

const notes = Object.entries(LEARN_NOTES)
const scopeIds = INFECTION_SIGNALS.map((signal) => signal.id)
const appIds = GROUPS.flatMap((group) => group.indicatorIds)

test('every note belongs to a parameter of the infection alert, and each of them has one', () => {
  assert.deepEqual(Object.keys(LEARN_NOTES).sort(), [...scopeIds].sort())
})

test('every note has at least one source, and every source has an https link', () => {
  for (const [id, note] of notes) {
    assert.ok(note.sources.length > 0, `${id} has no source`)
    for (const source of note.sources) {
      assert.ok(source.title.length > 0, `${id} has a source with no title`)
      assert.ok(source.url.startsWith('https://'), `${id}: ${source.url}`)
    }
  }
})

test('every drawing named in a note exists in public/learn', () => {
  for (const [id, note] of notes) {
    const { src, caption } = note.body.drawing

    assert.ok(src.startsWith('/learn/') && src.endsWith('.svg'), `${id}: ${src}`)
    assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)), `${id}: ${src} is missing`)
    assert.ok(caption.length > 0, `${id} has a drawing with no caption`)
  }
})

test('every parameter to read a note together with is another parameter of the app', () => {
  for (const [id, note] of notes) {
    assert.ok(note.readWith.length >= 2 && note.readWith.length <= 4, `${id} has ${note.readWith.length}`)
    for (const otherId of note.readWith) {
      assert.ok(appIds.includes(otherId), `${id} -> ${otherId}`)
      assert.notEqual(otherId, id)
    }
  }
})
