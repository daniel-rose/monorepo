import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import resolveProfile from '../../../src/resolve/resolveProfile'
import createSandbox from '../../helpers/createSandbox'

const CONFIG = {
  passthrough: ['update'],
  profiles: [
    {
      name: 'work',
      remotes: ['gitlab.example.com'],
      accounts: [
        { name: 'work-2', configDir: '~/.claude-work-2' },
        {
          name: 'work-3',
          configDir: '~/.claude-work-3',
          codex: { home: '~/.codex-work-3' },
        },
      ],
    },
    {
      name: 'private',
      configDir: '~/.claude-private',
      codex: { home: '~/.codex-private' },
      remotes: ['github.com/jane'],
      accounts: [
        {
          name: 'seat-2',
          configDir: '~/.claude-private-2',
          codex: { home: '~/.codex-private-2' },
        },
        { name: 'seat-3', configDir: '~/.claude-private-3' },
      ],
    },
  ],
}

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let workRepo = ''
let privateRepo = ''
let privateCodex = ''
let seatCodex = ''

const codex = { interactive: false, tool: 'codex' } as const

const resolveIn = (cwd: string, env: Record<string, string> = {}) =>
  resolveProfile([], sandbox.ctx(cwd, env), codex)

beforeAll(async () => {
  sandbox = await createSandbox()
  workRepo = await sandbox.repo('w/app', 'git@gitlab.example.com:acme/app.git')
  privateRepo = await sandbox.repo('p/app', 'git@github.com:jane/app.git')
  privateCodex = sandbox.dir('.codex-private')
  seatCodex = sandbox.dir('.codex-private-2')
  sandbox.dir('.codex-work-3')
  await sandbox.writeConfig(CONFIG)
})

afterAll(() => sandbox.cleanup())

describe('resolveProfile for codex', () => {
  it('uses the codex home of the profile for the first account', async () => {
    expect(await resolveIn(privateRepo)).toMatchObject({
      kind: 'profile',
      tool: 'codex',
      account: { name: 'private' },
      codexHome: { dir: privateCodex, source: 'own' },
    })
  })

  it('uses the codex home of the selected account', async () => {
    expect(
      await resolveIn(privateRepo, { CCPROFILE_ACCOUNT: 'seat-2' })
    ).toMatchObject({
      account: { name: 'seat-2' },
      codexHome: { dir: seatCodex, source: 'own' },
    })
  })

  it('falls back to the profile codex home for an account without one', async () => {
    expect(
      await resolveIn(privateRepo, { CCPROFILE_ACCOUNT: 'seat-3' })
    ).toMatchObject({
      account: { name: 'seat-3' },
      codexHome: { dir: privateCodex, source: 'profile' },
    })
  })

  it('uses ~/.codex when neither account nor profile has a codex home', async () => {
    expect(
      await resolveIn(workRepo, { CCPROFILE_ACCOUNT: 'work-2' })
    ).toMatchObject({
      account: { name: 'work-2' },
      codexHome: { dir: undefined, source: 'default' },
    })
  })

  it('uses the account codex home on a profile without one', async () => {
    expect(
      await resolveIn(workRepo, { CCPROFILE_ACCOUNT: 'work-3' })
    ).toMatchObject({
      codexHome: { dir: join(sandbox.home, '.codex-work-3'), source: 'own' },
    })
  })

  it('has no mcpConfig', async () => {
    expect(await resolveIn(privateRepo)).not.toHaveProperty('mcpConfig')
  })

  it('leaves everything alone under an explicit CODEX_HOME', async () => {
    expect(
      await resolveIn(privateRepo, {
        CODEX_HOME: '/x',
        CCPROFILE_ACCOUNT: 'nope',
      })
    ).toEqual({ kind: 'unchanged', reason: 'explicitCodexHome' })
  })

  it('follows CCPROFILE inside a claude session', async () => {
    expect(
      await resolveIn(sandbox.home, {
        CLAUDE_CONFIG_DIR: '/x',
        CCPROFILE: 'private',
        CCPROFILE_ACCOUNT: 'seat-3',
      })
    ).toMatchObject({
      kind: 'profile',
      codexHome: { dir: privateCodex, source: 'profile' },
    })
  })

  it.each([['--version'], ['-V'], ['-h'], ['help'], ['completion']])(
    'passes %s through with the fixed codex list',
    async arg => {
      expect(
        await resolveProfile([arg], sandbox.ctx(privateRepo), codex)
      ).toEqual({ kind: 'unchanged', reason: 'passthrough' })
    }
  )

  it('resolves login, so it lands in the right home', async () => {
    expect(
      await resolveProfile(['login'], sandbox.ctx(privateRepo), codex)
    ).toMatchObject({ kind: 'profile' })
  })

  it('rejects an unknown account', async () => {
    expect(await resolveIn(privateRepo, { CCPROFILE_ACCOUNT: 'nope' })).toEqual(
      {
        kind: 'error',
        messages: ['ccprofile: unknown account "nope" in profile "private"'],
      }
    )
  })

  it('points to link when the codex home does not exist', async () => {
    await sandbox.writeConfig({
      profiles: [
        { ...CONFIG.profiles[1], codex: { home: '~/.codex-missing' } },
      ],
    })
    const ctx = sandbox.ctx(privateRepo)

    await resolveProfile([], ctx, codex)

    expect(ctx.err()).toBe(
      `ccprofile: codex home ${join(sandbox.home, '.codex-missing')} of account "private" does not exist – run "ccprofile link"\n`
    )
    await sandbox.writeConfig(CONFIG)
  })
})
