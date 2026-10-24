import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let workRepo = ''
let privateNotes = ''
let plain = ''
let privateCodex = ''

const CONFIG = {
  profiles: [
    { name: 'work', remotes: ['gitlab.example.com'] },
    {
      name: 'private',
      configDir: '~/.claude-private',
      codex: { home: '~/.codex-private' },
      paths: ['~/Projects/private'],
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

beforeAll(async () => {
  sandbox = await createSandbox()
  workRepo = await sandbox.repo('w/app', 'git@gitlab.example.com:acme/app.git')
  privateNotes = sandbox.dir('Projects/private/notes')
  plain = sandbox.dir('plain')
  privateCodex = sandbox.dir('.codex-private')
  sandbox.dir('.codex-private-2')
  await sandbox.writeConfig(CONFIG)
})

afterAll(() => sandbox.cleanup())

const statusOf = async (cwd: string, env: Record<string, string> = {}) => {
  const ctx = sandbox.ctx(cwd, env)
  const code = await run(['status'], ctx)
  return { code, out: ctx.out(), err: ctx.err() }
}

describe('status with codex', () => {
  it('adds the codex home of the first account', async () => {
    const result = await statusOf(privateNotes)

    expect(result).toEqual({
      code: 0,
      out: `private (path ${join(sandbox.home, 'Projects', 'private')}), account private\ncodex: ${privateCodex}\n`,
      err: '',
    })
  })

  it('names the own codex home of an account', async () => {
    const result = await statusOf(privateNotes, { CCPROFILE_ACCOUNT: 'seat-2' })

    expect(result.out).toContain(
      `\ncodex: ${join(sandbox.home, '.codex-private-2')}\n`
    )
  })

  it('marks the codex home taken from the profile', async () => {
    const result = await statusOf(privateNotes, { CCPROFILE_ACCOUNT: 'seat-3' })

    expect(result.out).toContain(`\ncodex: ${privateCodex} (from profile)\n`)
  })

  it('names ~/.codex for a profile without codex', async () => {
    const result = await statusOf(workRepo)

    expect(result.out).toBe(
      'work (remote gitlab.example.com)\ncodex: ~/.codex (default)\n'
    )
  })

  it('names an explicit CODEX_HOME', async () => {
    const result = await statusOf(privateNotes, { CODEX_HOME: '/x' })

    expect(result.out).toContain('\ncodex: explicit (CODEX_HOME=/x)\n')
  })

  it('resolves codex on its own under CLAUDE_CONFIG_DIR', async () => {
    const result = await statusOf(plain, {
      CLAUDE_CONFIG_DIR: '/y',
      CCPROFILE: 'private',
    })

    expect(result.out).toBe(
      `explicit (CLAUDE_CONFIG_DIR=/y)\ncodex: ${privateCodex}\n`
    )
  })

  it('prints no codex line for no match', async () => {
    const result = await statusOf(plain)

    expect(result.out).toBe('no match (will prompt)\n')
  })

  it('prints no codex line when no profile uses codex', async () => {
    await sandbox.writeConfig({ profiles: [CONFIG.profiles[0]] })

    const result = await statusOf(workRepo)
    await sandbox.writeConfig(CONFIG)

    expect(result.out).toBe('work (remote gitlab.example.com)\n')
  })

  it('names an explicit CODEX_HOME even without codex in the config', async () => {
    await sandbox.writeConfig({ profiles: [CONFIG.profiles[0]] })

    const result = await statusOf(workRepo, { CODEX_HOME: '/x' })
    await sandbox.writeConfig(CONFIG)

    expect(result.out).toBe(
      'work (remote gitlab.example.com)\ncodex: explicit (CODEX_HOME=/x)\n'
    )
  })
})
