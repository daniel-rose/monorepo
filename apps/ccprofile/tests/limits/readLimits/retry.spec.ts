import { beforeEach, describe, expect, it, vi } from 'vitest'

import LIMITS_FIXTURE from '../../../mod/tests/limits.fixture'
import readLimits from '../../../src/limits/readLimits'

// The mod writes without rename: a read during its write sees half a file.
// The texts the next reads return, in order.
const texts = vi.hoisted(() => ({ queue: [] as string[], reads: 0 }))

vi.mock('node:fs/promises', () => ({
  readFile: () => {
    texts.reads += 1
    return Promise.resolve(texts.queue.shift() ?? '')
  },
}))

const ctx = { homedir: '/home/jane', platform: 'linux' } as const

beforeEach(() => {
  texts.queue = []
  texts.reads = 0
})

describe('readLimits retry', () => {
  it('reads a half-written file once more', async () => {
    texts.queue = ['{"version":1,"seenAt"', JSON.stringify(LIMITS_FIXTURE.file)]

    expect(await readLimits('/home/jane/.claude-2', ctx)).toMatchObject({
      status: 'ok',
      seenAt: LIMITS_FIXTURE.measuredAt,
    })
    expect(texts.reads).toBe(2)
  })

  it('reads valid JSON once', async () => {
    texts.queue = [JSON.stringify(LIMITS_FIXTURE.file)]

    await readLimits('/home/jane/.claude-2', ctx)

    expect(texts.reads).toBe(1)
  })

  it('gives up after the second broken read', async () => {
    texts.queue = ['{"version"', '{"version":1,']

    expect(await readLimits('/home/jane/.claude-2', ctx)).toEqual({
      status: 'invalid',
    })
    expect(texts.reads).toBe(2)
  })
})
