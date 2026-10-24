import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import selectProfile from '../../../src/prompt/selectProfile'
import createTestContext from '../../helpers/createTestContext'

const createProfiles = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    name:
      index === 0 ? 'work' : index === 1 ? 'private' : `profile${index + 1}`,
    configDir: undefined,
    paths: [],
    remotes: [],
    accounts: [],
  }))

const run = (profiles: ReturnType<typeof createProfiles>, input: string[]) => {
  const ctx = createTestContext({ stdin: Readable.from(input) })
  return { ctx, result: selectProfile(profiles, ctx) }
}

describe('selectProfile', () => {
  it('returns the profile for a valid number', async () => {
    const profiles = createProfiles(2)
    const { result } = run(profiles, ['2\n'])
    expect(await result).toBe(profiles[1])
  })

  it('asks again after an out-of-range answer', async () => {
    const profiles = createProfiles(2)
    const { ctx, result } = run(profiles, ['7\n2\n'])
    expect(await result).toBe(profiles[1])
    expect(ctx.err().split('Select profile [1-2]: ')).toHaveLength(3)
  })

  it('asks again after a non-numeric answer, also across chunks', async () => {
    const profiles = createProfiles(2)
    const { result } = run(profiles, ['x\n', '1\n'])
    expect(await result).toBe(profiles[0])
  })

  it('returns null for an empty line', async () => {
    expect(await run(createProfiles(2), ['\n']).result).toBeNull()
  })

  it('returns null on EOF', async () => {
    expect(await run(createProfiles(2), []).result).toBeNull()
  })

  it('supports multi-digit numbers', async () => {
    const profiles = createProfiles(12)
    const { result } = run(profiles, ['11\n'])
    expect(await result).toBe(profiles[10])
  })

  it('lists the profiles and the question on stderr', async () => {
    const { ctx, result } = run(createProfiles(2), ['1\n'])
    await result
    expect(ctx.err()).toContain('No Claude profile matches this directory:\n')
    expect(ctx.err()).toContain('  [1] work\n')
    expect(ctx.err()).toContain('  [2] private\n')
    expect(ctx.err()).toContain('Select profile [1-2]: ')
    expect(ctx.out()).toBe('')
  })
})
