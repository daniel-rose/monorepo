import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import { expect, mock, test } from 'claude-code/testing'

import LIMITS_FIXTURE from './limits.fixture'

type Written = { path: string; text: string }

// The engine beneath the mod: env, clock, a measurement that echoes, and
// every file write recorded.
const setUp = (on: On, env: Readonly<Record<string, string>>): Written[] => {
  mock.env(on, env)
  mock.clock(on, { now: LIMITS_FIXTURE.measuredAt })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  const written: Written[] = []
  on('fs.write', (_, e) => {
    written.push({ path: e.path, text: e.text })
    return { value: undefined }
  })
  return written
}

const measure = ($: Engine, rateLimits = [...LIMITS_FIXTURE.rateLimits]) =>
  $.session.measure({
    context: { window: 200_000 },
    rateLimits,
    changed: ['context'],
  })

test('writes format 1 into CLAUDE_CONFIG_DIR', async ($, on) => {
  const written = setUp(on, {
    CLAUDE_CONFIG_DIR: '/home/jane/.claude-private-2',
  })

  await measure($)

  expect(written.map(({ path }) => path)).toEqual([
    '/home/jane/.claude-private-2/ccprofile/limits.json',
  ])
  expect(written.map(({ text }) => JSON.parse(text) as unknown)).toEqual([
    LIMITS_FIXTURE.file,
  ])
})

test('falls back to ~/.claude without CLAUDE_CONFIG_DIR', async ($, on) => {
  const written = setUp(on, { HOME: '/home/jane' })

  await measure($)

  expect(written.map(({ path }) => path)).toEqual([
    '/home/jane/.claude/ccprofile/limits.json',
  ])
})

test('prefers USERPROFILE over HOME (Windows)', async ($, on) => {
  const written = setUp(on, {
    USERPROFILE: 'C:\\Users\\jane',
    HOME: '/c/Users/jane',
  })

  await measure($)

  // A posix host resolves the Windows path against its working directory.
  expect(
    written.map(({ path }) =>
      path.endsWith('C:\\Users\\jane/.claude/ccprofile/limits.json')
    )
  ).toEqual([true])
})

test('writes nothing off a subscription', async ($, on) => {
  const written = setUp(on, { CLAUDE_CONFIG_DIR: '/home/jane/.claude-private' })

  await measure($, [])

  expect(written).toEqual([])
})

test('a failed write leaves the measurement alone', async ($, on) => {
  mock.env(on, { CLAUDE_CONFIG_DIR: '/home/jane/.claude-private' })
  mock.clock(on, { now: LIMITS_FIXTURE.measuredAt })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('fs.write', () => {
    throw new Error('read-only file system')
  })

  expect(await measure($)).toEqual({ changed: ['context'] })
})
