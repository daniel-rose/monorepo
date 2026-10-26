import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import resolveProfile from '../../../src/resolve/resolveProfile'
import createSandbox from '../../helpers/createSandbox'

const ONLY = { profiles: [{ name: 'work', remotes: ['gitlab.example.com'] }] }

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let foreign = ''

beforeAll(async () => {
  sandbox = await createSandbox()
  foreign = await sandbox.repo('f/other', 'git@elsewhere.example:x/y.git')
})

afterAll(() => sandbox.cleanup())

describe('resolveProfile only profile', () => {
  it.each([
    { label: 'not interactive', interactive: false },
    { label: 'interactive', interactive: true },
  ])('uses it without asking when $label', async ({ interactive }) => {
    await sandbox.writeConfig(ONLY)
    const ctx = sandbox.ctx(foreign)

    const outcome = await resolveProfile([], ctx, { interactive })

    expect(outcome).toMatchObject({
      kind: 'profile',
      reason: 'onlyProfile',
      profile: { name: 'work' },
    })
    expect(ctx.err()).toBe('ccprofile: no match, using "work" (only profile)\n')
  })

  it('leaves a named onUnknown in charge', async () => {
    await sandbox.writeConfig({ ...ONLY, onUnknown: 'work' })

    const outcome = await resolveProfile([], sandbox.ctx(foreign), {
      interactive: false,
    })

    expect(outcome).toMatchObject({ kind: 'profile', reason: 'onUnknown' })
  })
})
