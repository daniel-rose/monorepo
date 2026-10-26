import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { setTimeout as delay } from 'node:timers/promises'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import { PROFILE_PROMPT_TEXT } from '../../../../src/constants'
import createSandbox from '../../../helpers/createSandbox'
import KEY from '../../../prompt/KEY'
import typeKeys from '../../../prompt/typeKeys'

const V2 = ['resolve', '--protocol', '2']

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let workRepo = ''
let plain = ''
let configDir = ''
// The protocol 2 line of the first account (empty account field), without
// .mcp.json.
let line = ''

beforeAll(async () => {
  sandbox = await createSandbox()
  workRepo = await sandbox.repo('w/app', 'git@gitlab.example.com:acme/app.git')
  plain = sandbox.dir('plain')
  configDir = join(sandbox.home, '.claude-work')
  line = `work\t\t${configDir}\t\n`
  sandbox.dir('.claude-work')
  sandbox.dir('.claude-work-2')
  await sandbox.writeConfig({
    profiles: [
      {
        name: 'work',
        configDir: '~/.claude-work',
        remotes: ['gitlab.example.com'],
        accounts: [{ name: 'work-2', configDir: '~/.claude-work-2' }],
      },
      // A second profile, so that no match prompts (one would be used).
      { name: 'private', remotes: ['github.com/jane'] },
    ],
  })
})

afterAll(() => sandbox.cleanup())

describe('resolve protocol 2', () => {
  it('prints account, configDir and mcpConfig of the selected account', async () => {
    const mcp = join(configDir, '.mcp.json')
    writeFileSync(mcp, '{}')
    const ctx = sandbox.ctx(workRepo, { CCPROFILE_ACCOUNT: 'work-2' })

    const code = await run([...V2, '--', 'hi'], ctx)
    rmSync(mcp)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(
      `work\twork-2\t${join(sandbox.home, '.claude-work-2')}\t${mcp}\n`
    )
  })

  it('exits 1 for an unknown account', async () => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE_ACCOUNT: 'nope' })

    const code = await run([...V2, '--', 'hi'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe(
      'ccprofile: unknown account "nope" in profile "work"\n'
    )
  })

  it('rejects an unsupported protocol', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run(['resolve', '--protocol', '3', '--', 'hi'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe(
      'ccprofile: unsupported protocol "3" – run "ccprofile setup"\n'
    )
  })
})

describe('resolve from a v1 hook (no --protocol)', () => {
  const outdated = 'ccprofile: hook outdated – run "ccprofile setup"\n'

  it('exits 1 instead of printing a profile line', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run(['resolve', '--', '-p', 'hi'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe(outdated)
  })

  it('prints only the outdated message, no resolve chatter', async () => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE_ACCOUNT: 'work-2' })
    rmSync(join(sandbox.home, '.claude-work-2'), { recursive: true })

    const code = await run(['resolve', '--', 'hi'], ctx)
    sandbox.dir('.claude-work-2')

    expect(code).toBe(1)
    expect(ctx.err()).toBe(outdated)
  })

  it('exits 1 instead of prompting', async () => {
    const stdin = Object.assign(new PassThrough(), { isTTY: true })
    stdin.end('1\n')
    const ctx = { ...sandbox.ctx(plain), stdin }

    const code = await run(['resolve', '--', 'x'], ctx)

    expect(code).toBe(1)
    expect(ctx.err()).toBe(outdated)
  })

  it('still starts claude unchanged under an explicit CLAUDE_CONFIG_DIR', async () => {
    const ctx = sandbox.ctx(workRepo, { CLAUDE_CONFIG_DIR: '/explicit' })

    const code = await run(['resolve', '--', 'hi'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe('')
  })
})

describe('resolve', () => {
  it('prints the matched profile line', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run([...V2, '--', '-p', 'hi'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(line)
    expect(ctx.err()).toBe('')
  })

  it('prints nothing when the env is unchanged', async () => {
    const ctx = sandbox.ctx(workRepo, { CLAUDE_CONFIG_DIR: '/explicit' })

    const code = await run([...V2, '--', '-p', 'hi'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe('')
  })

  // Passthrough also works from a v1 hook, so `claude --version` survives an
  // update until the hook is reinstalled.
  it.each([
    ['resolve', '--', '--version'],
    ['resolve', '--', '-v'],
    ['resolve', '--', '-h'],
    ['resolve', '--', '--help'],
    [...V2, '--', '--version'],
    [...V2, '--', '-h'],
  ])('passes %j through to claude', async (...argv) => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run(argv, ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe('')
  })

  it('keeps a second -- as a real argument', async () => {
    const ctx = sandbox.ctx(workRepo)

    const code = await run([...V2, '--', '-p', '--', '--version'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(line)
  })

  it('exits 1 with the messages for an unknown profile', async () => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE: 'nope' })

    const code = await run([...V2, '--', 'x'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe('ccprofile: unknown profile "nope"\n')
  })

  it('exits 1 with the issues for an invalid config', async () => {
    const broken = await createSandbox()
    await broken.writeConfig('{')
    const ctx = broken.ctx(broken.dir('x'))

    const code = await run([...V2, '--', 'x'], ctx)
    await broken.cleanup()

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toMatch(/^ccprofile: invalid config .+\nccprofile: {3}/)
  })

  it('explains noMatch without a TTY', async () => {
    const ctx = sandbox.ctx(plain)

    const code = await run([...V2, '--', 'x'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe(
      `ccprofile: no profile matches and no interactive input is available – set "onUnknown" in ${join(sandbox.home, '.config', 'ccprofile', 'config.json')} or run CCPROFILE=<name> claude\n`
    )
  })

  // The real prompt: it writes to stderr, stdout carries only the line.
  it('prompts when stdin is a TTY', async () => {
    const stdin = Object.assign(new PassThrough(), { isTTY: true })
    const ctx = { ...sandbox.ctx(plain), stdin }
    // Keys typed before the prompt listens are lost.
    const answer = async () => {
      while (!ctx.err().includes(PROFILE_PROMPT_TEXT.message)) await delay(5)
      await typeKeys(stdin, ['1', KEY.enter])
    }
    void answer()

    const code = await run([...V2, '--', 'x'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(line)
  })
})

describe('resolve with CCPROFILE_ARGV', () => {
  const argvOf = (value: unknown) => JSON.stringify(value)

  it('reads the arguments from the env, including awkward ones', async () => {
    const ctx = sandbox.ctx(workRepo, {
      CCPROFILE_ARGV: argvOf(['', '--', 'ü', '"q"', '--version']),
    })

    const code = await run(V2, ctx)

    // `--version` follows a literal `--`, so it is a real argument.
    expect(code).toBe(0)
    expect(ctx.out()).toBe(line)
  })

  it('applies passthrough to the env arguments', async () => {
    const ctx = sandbox.ctx(workRepo, {
      CCPROFILE_ARGV: argvOf(['--version']),
    })

    const code = await run([...V2, '--'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe('')
  })

  it('ignores the env when arguments follow --', async () => {
    const ctx = sandbox.ctx(workRepo, {
      CCPROFILE_ARGV: argvOf(['--version']),
    })

    const code = await run([...V2, '--', 'hi'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(line)
  })

  it('treats an empty env value as unset', async () => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE_ARGV: '' })

    const code = await run([...V2, '--'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(line)
  })

  it.each([
    ['not JSON', '{'],
    ['an object', '{"a":1}'],
    ['non-string items', '["a",1]'],
  ])('rejects %s', async (_label, value) => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE_ARGV: value })

    const code = await run(V2, ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toMatch(/^ccprofile: invalid CCPROFILE_ARGV \(.+\)\n$/)
  })
})
