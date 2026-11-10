import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import run from '../../../src/cli'
import createSandbox from '../../helpers/createSandbox'

// What the commands show and do for a profile with `codex: false`.
const CONFIG = {
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

beforeAll(async () => {
  sandbox = await createSandbox()
  privateRepo = await sandbox.repo('p/app', 'git@github.com:jane/app.git')
  await sandbox.writeConfig(CONFIG)
})

afterAll(() => sandbox.cleanup())

const runIn = async (args: string[], env: Record<string, string> = {}) => {
  const ctx = sandbox.ctx(privateRepo, env)
  const code = await run(args, ctx)
  return { code, out: ctx.out(), err: ctx.err() }
}

describe('commands with codex: false', () => {
  it('resolve --tool codex fails without a profile line', async () => {
    const result = await runIn([
      'resolve',
      '--protocol',
      '2',
      '--tool',
      'codex',
      '--',
    ])

    expect(result).toEqual({
      code: 1,
      out: '',
      err: 'ccprofile: profile "private" has no codex (codex: false)\n',
    })
  })

  it('resolve for claude still prints the profile line', async () => {
    const result = await runIn(['resolve', '--protocol', '2', '--'])

    expect(result.code).toBe(0)
    expect(result.out).toMatch(/^private\t/)
  })

  it('status shows codex as disabled', async () => {
    const result = await runIn(['status'])

    expect(result.code).toBe(0)
    expect(result.out).toBe(
      'private (remote github.com/jane), account private\ncodex: disabled (codex: false)\n'
    )
  })

  it('list shows one codex line for the profile', async () => {
    const result = await runIn(['list'])

    expect(result.out).toContain(
      '[private]\n  configDir: '.concat(join(sandbox.home, '.claude-private'))
    )
    expect(result.out).toContain('  codex: disabled (codex: false)\n')
    expect(result.out).not.toContain('codex account: seat-2')
  })

  it('link creates no codex home', async () => {
    const result = await runIn(['link', '--yes'])

    expect(result.code).toBe(0)
    expect(result.out).not.toContain('codex')
    expect(existsSync(join(sandbox.home, '.codex'))).toBe(false)
  })
})
