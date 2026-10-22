import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let workRepo = ''
let plain = ''
let configDir = ''

beforeAll(async () => {
  sandbox = await createSandbox()
  workRepo = await sandbox.repo('w/app', 'git@gitlab.example.com:acme/app.git')
  plain = sandbox.dir('plain')
  configDir = join(sandbox.home, '.claude-work')
  sandbox.dir('.claude-work')
  await sandbox.writeConfig({
    profiles: [
      {
        name: 'work',
        configDir: '~/.claude-work',
        remotes: ['gitlab.example.com'],
      },
    ],
  })
})

afterAll(() => sandbox.cleanup())

describe('resolve', () => {
  it('prints the matched profile line', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run(['resolve', '--', '-p', 'hi'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(`work\t${configDir}\n`)
    expect(ctx.err()).toBe('')
  })

  it('prints nothing when the env is unchanged', async () => {
    const ctx = sandbox.ctx(workRepo, { CLAUDE_CONFIG_DIR: '/explicit' })

    const code = await run(['resolve', '--', '-p', 'hi'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe('')
  })

  it.each([
    ['resolve', '--', '--version'],
    ['resolve', '--', '-v'],
    ['resolve', '--', '-h'],
    ['resolve', '--', '--help'],
  ])('passes %j through to claude', async (...argv) => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run(argv, ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe('')
  })

  it('keeps a second -- as a real argument', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run(['resolve', '--', '-p', '--', '--version'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(`work\t${configDir}\n`)
  })

  it('exits 1 with the messages for an unknown profile', async () => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE: 'nope' })

    const code = await run(['resolve', '--', 'x'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe('ccprofile: unknown profile "nope"\n')
  })

  it('exits 1 with the issues for an invalid config', async () => {
    const broken = await createSandbox()
    await broken.writeConfig('{')
    const ctx = broken.ctx(broken.dir('x'))

    const code = await run(['resolve', '--', 'x'], ctx)
    await broken.cleanup()

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toMatch(/^ccprofile: invalid config .+\nccprofile: {3}/)
  })

  it('explains noMatch without a TTY', async () => {
    const ctx = sandbox.ctx(plain)

    const code = await run(['resolve', '--', 'x'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe(
      `ccprofile: no profile matches and no interactive input is available – set "onUnknown" in ${join(sandbox.home, '.config', 'ccprofile', 'config.json')} or run CCPROFILE=<name> claude\n`
    )
  })

  it('prompts when stdin is a TTY', async () => {
    const stdin = Object.assign(new PassThrough(), { isTTY: true })
    stdin.end('1\n')
    const ctx = { ...sandbox.ctx(plain), stdin }

    const code = await run(['resolve', '--', 'x'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(`work\t${configDir}\n`)
  })
})

describe('resolve with CCPROFILE_ARGV', () => {
  const argvOf = (value: unknown) => JSON.stringify(value)

  it('reads the arguments from the env, including awkward ones', async () => {
    const ctx = sandbox.ctx(workRepo, {
      CCPROFILE_ARGV: argvOf(['', '--', 'ü', '"q"', '--version']),
    })

    const code = await run(['resolve'], ctx)

    // `--version` follows a literal `--`, so it is a real argument.
    expect(code).toBe(0)
    expect(ctx.out()).toBe(`work\t${configDir}\n`)
  })

  it('applies passthrough to the env arguments', async () => {
    const ctx = sandbox.ctx(workRepo, {
      CCPROFILE_ARGV: argvOf(['--version']),
    })

    const code = await run(['resolve', '--'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe('')
  })

  it('ignores the env when arguments follow --', async () => {
    const ctx = sandbox.ctx(workRepo, {
      CCPROFILE_ARGV: argvOf(['--version']),
    })

    const code = await run(['resolve', '--', 'hi'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(`work\t${configDir}\n`)
  })

  it('treats an empty env value as unset', async () => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE_ARGV: '' })

    const code = await run(['resolve', '--'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(`work\t${configDir}\n`)
  })

  it.each([
    ['not JSON', '{'],
    ['an object', '{"a":1}'],
    ['non-string items', '["a",1]'],
  ])('rejects %s', async (_label, value) => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE_ARGV: value })

    const code = await run(['resolve'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toMatch(/^ccprofile: invalid CCPROFILE_ARGV \(.+\)\n$/)
  })
})
