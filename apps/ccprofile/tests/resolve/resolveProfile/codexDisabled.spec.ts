import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import resolveProfile from '../../../src/resolve/resolveProfile'
import createSandbox from '../../helpers/createSandbox'

// `private` matches its repo and disables codex; `work` is the onUnknown
// profile on ~/.codex, so a fallback to it would be visible.
const CONFIG = {
  onUnknown: 'work',
  profiles: [
    { name: 'work', remotes: ['gitlab.example.com'] },
    {
      name: 'private',
      configDir: '~/.claude-private',
      codex: false,
      remotes: ['github.com/jane'],
      accounts: [{ name: 'seat-2', configDir: '~/.claude-private-2' }],
    },
  ],
}

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let privateRepo = ''

const codex = { interactive: false, tool: 'codex' } as const

const resolveIn = (env: Record<string, string> = {}, args: string[] = []) =>
  resolveProfile(args, sandbox.ctx(privateRepo, env), codex)

beforeAll(async () => {
  sandbox = await createSandbox()
  privateRepo = await sandbox.repo('p/app', 'git@github.com:jane/app.git')
  await sandbox.writeConfig(CONFIG)
})

afterAll(() => sandbox.cleanup())

describe('resolveProfile for codex with codex: false', () => {
  it('reports the profile as disabled instead of falling back', async () => {
    expect(await resolveIn()).toMatchObject({
      kind: 'disabled',
      tool: 'codex',
      profile: { name: 'private' },
      account: { name: 'private' },
      reason: 'match',
    })
  })

  it('disables every account of the profile', async () => {
    expect(await resolveIn({ CCPROFILE_ACCOUNT: 'seat-2' })).toMatchObject({
      kind: 'disabled',
      account: { name: 'seat-2' },
    })
  })

  it('applies to an explicit CCPROFILE too', async () => {
    const ctx = sandbox.ctx(sandbox.home, { CCPROFILE: 'private' })

    expect(await resolveProfile([], ctx, codex)).toMatchObject({
      kind: 'disabled',
      reason: 'explicitProfile',
    })
  })

  it('still lets an explicit CCPROFILE pick another profile', async () => {
    expect(await resolveIn({ CCPROFILE: 'work' })).toMatchObject({
      kind: 'profile',
      profile: { name: 'work' },
      codexHome: { dir: undefined, source: 'default' },
    })
  })

  it('leaves everything alone under an explicit CODEX_HOME', async () => {
    expect(await resolveIn({ CODEX_HOME: '/x' })).toEqual({
      kind: 'unchanged',
      reason: 'explicitCodexHome',
    })
  })

  it('passes --version through', async () => {
    expect(await resolveIn({}, ['--version'])).toEqual({
      kind: 'unchanged',
      reason: 'passthrough',
    })
  })

  it('prints nothing on stderr', async () => {
    const ctx = sandbox.ctx(privateRepo)

    await resolveProfile([], ctx, codex)

    expect(ctx.err()).toBe('')
  })

  it('leaves claude in the same profile alone', async () => {
    expect(
      await resolveProfile([], sandbox.ctx(privateRepo), { interactive: false })
    ).toMatchObject({ kind: 'profile', tool: 'claude' })
  })
})
