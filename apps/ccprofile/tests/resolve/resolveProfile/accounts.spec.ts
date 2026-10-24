import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import resolveProfile from '../../../src/resolve/resolveProfile'
import createSandbox from '../../helpers/createSandbox'

const CONFIG = {
  profiles: [
    {
      name: 'work',
      remotes: ['gitlab.example.com'],
      accounts: [{ name: 'work-2', configDir: '~/.claude-work-2' }],
    },
    {
      name: 'private',
      configDir: '~/.claude-private',
      remotes: ['github.com/jane'],
      accounts: [{ name: 'seat-2', configDir: '~/.claude-private-2' }],
    },
  ],
}

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let workRepo = ''
let privateRepo = ''
let privateDir = ''
let seatDir = ''

const batch = { interactive: false }

beforeAll(async () => {
  sandbox = await createSandbox()
  workRepo = await sandbox.repo('w/app', 'git@gitlab.example.com:acme/app.git')
  privateRepo = await sandbox.repo('p/app', 'git@github.com:jane/app.git')
  privateDir = sandbox.dir('.claude-private')
  seatDir = sandbox.dir('.claude-private-2')
  sandbox.dir('.claude-work-2')
  await sandbox.writeConfig(CONFIG)
})

afterAll(() => sandbox.cleanup())

afterEach(() => {
  rmSync(join(privateDir, '.mcp.json'), { force: true })
  rmSync(join(sandbox.home, '.claude'), { recursive: true, force: true })
})

describe('resolveProfile accounts', () => {
  it('picks the first account, named after the profile', async () => {
    const outcome = await resolveProfile([], sandbox.ctx(privateRepo), batch)

    expect(outcome).toMatchObject({
      kind: 'profile',
      account: { name: 'private', configDir: privateDir },
    })
  })

  it('picks the first account of the default profile without configDir', async () => {
    const outcome = await resolveProfile([], sandbox.ctx(workRepo), batch)

    expect(outcome).toMatchObject({
      kind: 'profile',
      account: { name: 'work', configDir: undefined },
    })
  })

  it('selects an account through CCPROFILE_ACCOUNT', async () => {
    const ctx = sandbox.ctx(privateRepo, { CCPROFILE_ACCOUNT: 'seat-2' })

    const outcome = await resolveProfile([], ctx, batch)

    expect(outcome).toMatchObject({
      kind: 'profile',
      reason: 'match',
      account: { name: 'seat-2', configDir: seatDir },
    })
    expect(ctx.err()).toBe('')
  })

  it('selects the first account by the profile name', async () => {
    const ctx = sandbox.ctx(privateRepo, { CCPROFILE_ACCOUNT: 'private' })

    expect(await resolveProfile([], ctx, batch)).toMatchObject({
      account: { name: 'private', configDir: privateDir },
    })
  })

  it('selects an account of the default profile', async () => {
    const ctx = sandbox.ctx(workRepo, { CCPROFILE_ACCOUNT: 'work-2' })

    expect(await resolveProfile([], ctx, batch)).toMatchObject({
      account: {
        name: 'work-2',
        configDir: join(sandbox.home, '.claude-work-2'),
      },
    })
  })

  it('treats an empty CCPROFILE_ACCOUNT as unset', async () => {
    const ctx = sandbox.ctx(privateRepo, { CCPROFILE_ACCOUNT: '' })

    expect(await resolveProfile([], ctx, batch)).toMatchObject({
      account: { name: 'private' },
    })
  })

  it('rejects an account of another profile', async () => {
    const ctx = sandbox.ctx(privateRepo, { CCPROFILE_ACCOUNT: 'work-2' })

    expect(await resolveProfile([], ctx, batch)).toEqual({
      kind: 'error',
      messages: ['ccprofile: unknown account "work-2" in profile "private"'],
    })
  })

  it('rejects CCPROFILE_ACCOUNT without a config file', async () => {
    const ctx = sandbox.ctx(privateRepo, {
      CCPROFILE_ACCOUNT: 'seat-2',
      XDG_CONFIG_HOME: sandbox.dir('empty-xdg'),
    })

    expect(await resolveProfile([], ctx, batch)).toEqual({
      kind: 'error',
      messages: [
        'ccprofile: CCPROFILE_ACCOUNT="seat-2" is set, but no profile applies',
      ],
    })
  })

  it('does not validate CCPROFILE_ACCOUNT under an explicit CLAUDE_CONFIG_DIR', async () => {
    const ctx = sandbox.ctx(privateRepo, {
      CCPROFILE_ACCOUNT: 'nope',
      CLAUDE_CONFIG_DIR: '/explicit',
    })

    expect(await resolveProfile([], ctx, batch)).toEqual({
      kind: 'unchanged',
      reason: 'explicitConfigDir',
    })
  })

  it('skips the account for passthrough arguments', async () => {
    const ctx = sandbox.ctx(privateRepo, { CCPROFILE_ACCOUNT: 'nope' })

    expect(await resolveProfile(['--version'], ctx, batch)).toEqual({
      kind: 'unchanged',
      reason: 'passthrough',
    })
  })

  it('warns about a missing account configDir and points to link', async () => {
    rmSync(seatDir, { recursive: true })
    const ctx = sandbox.ctx(privateRepo, { CCPROFILE_ACCOUNT: 'seat-2' })

    await resolveProfile([], ctx, batch)
    sandbox.dir('.claude-private-2')

    expect(ctx.err()).toBe(
      `ccprofile: creating new account "seat-2" of profile "private" at ${seatDir}, first start will ask for login – run "ccprofile link" to share the profile config\n`
    )
  })
})

describe('resolveProfile mcpConfig', () => {
  it('passes the .mcp.json of the shared source to every account', async () => {
    writeFileSync(join(privateDir, '.mcp.json'), '{}')
    const ctx = sandbox.ctx(privateRepo, { CCPROFILE_ACCOUNT: 'seat-2' })

    expect(await resolveProfile([], ctx, batch)).toMatchObject({
      mcpConfig: join(privateDir, '.mcp.json'),
    })
  })

  it('reads ~/.claude/.mcp.json for the default profile', async () => {
    writeFileSync(join(sandbox.dir('.claude'), '.mcp.json'), '{}')

    expect(
      await resolveProfile([], sandbox.ctx(workRepo), batch)
    ).toMatchObject({ mcpConfig: join(sandbox.home, '.claude', '.mcp.json') })
  })

  it('is undefined without a .mcp.json', async () => {
    const outcome = await resolveProfile([], sandbox.ctx(privateRepo), batch)

    expect(outcome).toMatchObject({ kind: 'profile', mcpConfig: undefined })
  })
})
