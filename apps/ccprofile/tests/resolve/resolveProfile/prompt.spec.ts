import { join } from 'node:path'

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { select } from '../../../src/prompt'
import resolveProfile from '../../../src/resolve/resolveProfile'
import createSandbox from '../../helpers/createSandbox'

vi.mock('../../../src/prompt')

const CONFIG = {
  profiles: [
    { name: 'work', remotes: ['gitlab.example.com'] },
    { name: 'private', configDir: '~/.claude-private', remotes: ['x.test'] },
  ],
}

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let foreign = ''

beforeAll(async () => {
  sandbox = await createSandbox()
  foreign = await sandbox.repo('f/other', 'git@elsewhere.example:x/y.git')
  await sandbox.writeConfig(CONFIG)
})

afterAll(() => sandbox.cleanup())

beforeEach(() => vi.mocked(select).mockReset())

// Picks the choice with that name, as a user would.
const pick = (name: string) =>
  vi
    .mocked(select)
    .mockImplementationOnce(({ choices }) =>
      Promise.resolve(choices.find(choice => choice.name === name)?.value)
    )

describe('resolveProfile prompt', () => {
  it('uses the picked profile and prints the hint', async () => {
    pick('private')
    const ctx = sandbox.ctx(foreign)

    const outcome = await resolveProfile([], ctx, { interactive: true })

    expect(outcome).toMatchObject({
      kind: 'profile',
      reason: 'prompt',
      profile: { name: 'private' },
    })
    expect(ctx.err()).toContain(
      `ccprofile: creating new profile "private" at ${join(sandbox.home, '.claude-private')}`
    )
    expect(ctx.err()).toContain(
      'ccprofile: add a "paths" or "remotes" entry to skip this prompt\n'
    )
  })

  it('aborts when the prompt is cancelled', async () => {
    vi.mocked(select).mockResolvedValueOnce(null)

    const outcome = await resolveProfile([], sandbox.ctx(foreign), {
      interactive: true,
    })

    expect(outcome).toEqual({
      kind: 'error',
      messages: ['ccprofile: aborted'],
    })
  })

  it('does not prompt when not interactive', async () => {
    const ctx = sandbox.ctx(foreign)

    const outcome = await resolveProfile([], ctx, { interactive: false })

    expect(outcome).toEqual({ kind: 'noMatch' })
    expect(select).not.toHaveBeenCalled()
    expect(ctx.err()).toBe('')
  })
})
