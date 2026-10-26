import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import SWITCH_FIXTURE from '../../../../mod/tests/switch.fixture'
import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'

const SESSION = SWITCH_FIXTURE.handoff.sessionId

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let firstDir = ''
let secondDir = ''
let file = ''

beforeAll(async () => {
  sandbox = await createSandbox()
  firstDir = sandbox.dir('.claude-private')
  secondDir = sandbox.dir('.claude-private-2')
  file = join(sandbox.dir('tmp'), 'ccprofile-handoff.abc123')
  await sandbox.writeConfig({
    profiles: [
      {
        name: 'private',
        configDir: '~/.claude-private',
        remotes: ['github.com/jane'],
        accounts: [{ name: 'seat-2', configDir: '~/.claude-private-2' }],
      },
      { name: 'work', remotes: ['gitlab.example.com'] },
    ],
  })
})

afterAll(() => sandbox.cleanup())

afterEach(() => {
  rmSync(file, { force: true })
  rmSync(join(firstDir, '.mcp.json'), { force: true })
})

const writeHandoff = (content: unknown): void =>
  writeFileSync(
    file,
    typeof content === 'string' ? content : JSON.stringify(content)
  )

const handoffOf = async (
  env: Record<string, string> = { CCPROFILE: 'private', CCPROFILE_ACCOUNT: '' },
  args = ['--protocol', '2', '--file', file]
) => {
  const ctx = sandbox.ctx(sandbox.home, env)
  const code = await run(['handoff', ...args], ctx)
  return { code, out: ctx.out(), err: ctx.err() }
}

describe('handoff', () => {
  it('prints the account to resume on and removes the file', async () => {
    // The file the mod writes (shared fixture).
    writeHandoff(SWITCH_FIXTURE.handoff)

    expect(await handoffOf()).toEqual({
      code: 0,
      out: `private\tseat-2\t${secondDir}\t\t${SESSION}\n`,
      err: 'ccprofile: resuming session 0a1b2c3d as account "seat-2" of profile "private"\n',
    })
    expect(existsSync(file)).toBe(false)
  })

  it('resumes on the first account with an empty account field', async () => {
    writeFileSync(join(firstDir, '.mcp.json'), '{}')
    writeHandoff({
      version: 1,
      profile: 'private',
      account: 'private',
      sessionId: SESSION,
    })

    const result = await handoffOf({
      CCPROFILE: 'private',
      CCPROFILE_ACCOUNT: 'seat-2',
    })

    expect(result.out).toBe(
      `private\t\t${firstDir}\t${join(firstDir, '.mcp.json')}\t${SESSION}\n`
    )
  })

  it.each([
    [
      'the running account',
      { profile: 'private', account: 'private' },
      'already on account "private"',
    ],
    [
      'another profile',
      { profile: 'work', account: 'work' },
      'written for profile "work", running "private"',
    ],
    [
      'an unknown account',
      { profile: 'private', account: 'seat-9' },
      'unknown account "seat-9" in profile "private"',
    ],
  ])('skips %s, naming the session', async (_, fields, reason) => {
    writeHandoff({ version: 1, ...fields, sessionId: SESSION })

    expect(await handoffOf()).toEqual({
      code: 0,
      out: '',
      err: `ccprofile: switch skipped (${reason}) – resume by hand with "claude --resume ${SESSION}"\n`,
    })
    expect(existsSync(file)).toBe(false)
  })

  it.each([
    ['broken JSON', '{"version":', 'handoff file invalid'],
    ['a wrong field type', { version: 1, profile: 1 }, 'handoff file invalid'],
    ['another version', { version: 2 }, 'handoff file version 2 unsupported'],
    [
      'an invalid session id',
      {
        version: 1,
        profile: 'private',
        account: 'seat-2',
        sessionId: '$(rm -rf ~)',
      },
      'invalid session id',
    ],
  ])('skips %s', async (_, content, reason) => {
    writeHandoff(content)

    expect(await handoffOf()).toEqual({
      code: 0,
      out: '',
      err: `ccprofile: switch skipped (${reason})\n`,
    })
    expect(existsSync(file)).toBe(false)
  })

  it('skips a missing file', async () => {
    expect((await handoffOf()).err).toBe(
      'ccprofile: switch skipped (handoff file unreadable)\n'
    )
  })

  it('skips a directory it cannot remove', async () => {
    const dir = sandbox.dir('tmp/not-a-file')

    expect(
      await handoffOf(undefined, ['--protocol', '2', '--file', dir])
    ).toEqual({
      code: 0,
      out: '',
      err: 'ccprofile: switch skipped (handoff file unreadable)\n',
    })
  })

  it('names the session of a handoff it cannot read further', async () => {
    writeHandoff({ version: 2, sessionId: SESSION })

    expect((await handoffOf()).err).toBe(
      `ccprofile: switch skipped (handoff file version 2 unsupported) – resume by hand with "claude --resume ${SESSION}"\n`
    )
  })

  it('skips without CCPROFILE, naming the session', async () => {
    writeHandoff({
      version: 1,
      profile: 'private',
      account: 'seat-2',
      sessionId: SESSION,
    })

    expect((await handoffOf({})).err).toBe(
      `ccprofile: switch skipped (CCPROFILE is not set – start claude through the ccprofile hook) – resume by hand with "claude --resume ${SESSION}"\n`
    )
  })

  it('fails without the protocol flag', async () => {
    expect(await handoffOf(undefined, ['--file', file])).toEqual({
      code: 1,
      out: '',
      err: 'ccprofile: unsupported protocol "" – run "ccprofile setup"\n',
    })
  })
})
