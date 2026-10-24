import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let workRepo = ''
let privateNotes = ''
let plain = ''

const CONFIG = {
  profiles: [
    { name: 'work', remotes: ['gitlab.example.com'] },
    {
      name: 'private',
      configDir: '~/.claude-private',
      paths: ['~/Projects/private'],
    },
  ],
}

beforeAll(async () => {
  sandbox = await createSandbox()
  workRepo = await sandbox.repo('w/app', 'git@gitlab.example.com:acme/app.git')
  privateNotes = sandbox.dir('Projects/private/notes')
  plain = sandbox.dir('plain')
  await sandbox.writeConfig(CONFIG)
})

afterAll(() => sandbox.cleanup())

const statusOf = async (cwd: string, env: Record<string, string> = {}) => {
  const ctx = sandbox.ctx(cwd, env)
  const code = await run(['status'], ctx)
  return { code, out: ctx.out(), err: ctx.err() }
}

describe('status', () => {
  it('names the remote match', async () => {
    const result = await statusOf(workRepo)

    expect(result).toEqual({
      code: 0,
      out: 'work (remote gitlab.example.com)\n',
      err: '',
    })
  })

  it('names the path match', async () => {
    const result = await statusOf(privateNotes)

    expect(result.out).toBe(
      `private (path ${join(sandbox.home, 'Projects', 'private')})\n`
    )
  })

  it('names an explicit CLAUDE_CONFIG_DIR', async () => {
    const result = await statusOf(plain, { CLAUDE_CONFIG_DIR: '/explicit' })

    expect(result.out).toBe('explicit (CLAUDE_CONFIG_DIR=/explicit)\n')
  })

  it('names an explicit CCPROFILE', async () => {
    const result = await statusOf(plain, { CCPROFILE: 'private' })

    expect(result.out).toBe('explicit (CCPROFILE=private)\n')
  })

  it('reports a missing config', async () => {
    const empty = await createSandbox()
    const ctx = empty.ctx(empty.dir('x'))

    const code = await run(['status'], ctx)
    await empty.cleanup()

    expect(code).toBe(0)
    expect(ctx.out()).toBe(
      `no profiles configured (${join(empty.home, '.config', 'ccprofile', 'config.json')})\n`
    )
  })

  it('announces the prompt without prompting', async () => {
    const result = await statusOf(plain)

    expect(result).toEqual({
      code: 0,
      out: 'no match (will prompt)\n',
      err: '',
    })
  })

  it('reports onUnknown on stdout only', async () => {
    const other = await createSandbox()
    await other.writeConfig({ ...CONFIG, onUnknown: 'private' })
    const ctx = other.ctx(other.dir('x'))

    const code = await run(['status'], ctx)
    await other.cleanup()

    expect(code).toBe(0)
    expect(ctx.out()).toBe('private (onUnknown)\n')
    expect(ctx.err()).toBe('')
  })

  it('exits 1 with the issues for an invalid config', async () => {
    const broken = await createSandbox()
    await broken.writeConfig('{')
    const ctx = broken.ctx(broken.dir('x'))

    const code = await run(['status'], ctx)
    await broken.cleanup()

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toMatch(/^ccprofile: invalid config /)
  })

  it('names the account of a profile with accounts', async () => {
    const multi = await createSandbox()
    const repo = await multi.repo('w/app', 'git@gitlab.example.com:acme/a.git')
    multi.dir('.claude-work-2')
    await multi.writeConfig({
      profiles: [
        {
          ...CONFIG.profiles[0],
          accounts: [{ name: 'work-2', configDir: '~/.claude-work-2' }],
        },
      ],
    })
    const first = multi.ctx(repo)
    const second = multi.ctx(repo, { CCPROFILE_ACCOUNT: 'work-2' })

    await run(['status'], first)
    await run(['status'], second)
    await multi.cleanup()

    expect(first.out()).toBe('work (remote gitlab.example.com), account work\n')
    expect(second.out()).toBe(
      'work (remote gitlab.example.com), account work-2 (CCPROFILE_ACCOUNT)\n'
    )
  })

  it('is what ccprofile does without arguments', async () => {
    const withStatus = sandbox.ctx(workRepo)
    const without = sandbox.ctx(workRepo)

    await run(['status'], withStatus)
    const code = await run([], without)

    expect(code).toBe(0)
    expect(without.out()).toBe(withStatus.out())
  })
})
