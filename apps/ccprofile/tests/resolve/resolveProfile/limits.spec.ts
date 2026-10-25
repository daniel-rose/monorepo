import { rmSync } from 'node:fs'
import { join } from 'node:path'

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import resolveProfile from '../../../src/resolve/resolveProfile'
import createSandbox from '../../helpers/createSandbox'
import writeLimitsFile from '../../helpers/writeLimits'

// Sunday, 2026-10-25 12:00 UTC.
const NOW = Date.UTC(2026, 9, 25, 12, 0)
const TODAY_1430 = '2026-10-25T14:30:00.000Z'
const TUESDAY_0900 = '2026-10-27T09:00:00.000Z'

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
      codex: { home: '~/.codex-private' },
      accounts: [
        { name: 'seat-2', configDir: '~/.claude-private-2' },
        { name: 'seat-3', configDir: '~/.claude-private-3' },
      ],
    },
  ],
}

type Window = { kind: string; percentUsed: number; resetsAt?: string }

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let workRepo = ''
let privateRepo = ''
const dirs: Record<string, string> = {}

const batch = { interactive: false }

const writeLimits = (dir: string, ...rateLimits: Window[]) =>
  writeLimitsFile(dir, rateLimits)

const fiveHour = (percentUsed: number, resetsAt = TODAY_1430): Window => ({
  kind: 'five_hour',
  percentUsed,
  resetsAt,
})

const ctx = (cwd: string, env: Record<string, string> = {}) => ({
  ...sandbox.ctx(cwd, env),
  now: () => NOW,
})

beforeAll(async () => {
  vi.stubEnv('TZ', 'UTC')
  sandbox = await createSandbox()
  workRepo = await sandbox.repo('w/app', 'git@gitlab.example.com:acme/app.git')
  privateRepo = await sandbox.repo('p/app', 'git@github.com:jane/app.git')
  for (const name of [
    '.claude',
    '.claude-work-2',
    '.claude-private',
    '.claude-private-2',
    '.claude-private-3',
    '.codex-private',
  ]) {
    dirs[name] = sandbox.dir(name)
  }
  await sandbox.writeConfig(CONFIG)
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await sandbox.cleanup()
})

afterEach(() => {
  for (const dir of Object.values(dirs)) {
    rmSync(join(dir, 'ccprofile'), { recursive: true, force: true })
  }
})

describe('resolveProfile limits', () => {
  it('starts the first account without any limit data, silently', async () => {
    const context = ctx(privateRepo)

    expect(await resolveProfile([], context, batch)).toMatchObject({
      account: { name: 'private' },
      selection: { kind: 'first' },
    })
    expect(context.err()).toBe('')
  })

  it('keeps the first account below the threshold', async () => {
    writeLimits(dirs['.claude-private'], fiveHour(89.9))
    const context = ctx(privateRepo)

    expect(await resolveProfile([], context, batch)).toMatchObject({
      account: { name: 'private' },
      selection: { kind: 'first' },
    })
    expect(context.err()).toBe('')
  })

  it('skips full accounts and says why', async () => {
    writeLimits(dirs['.claude-private'], fiveHour(97))
    writeLimits(dirs['.claude-private-2'], {
      kind: 'seven_day',
      percentUsed: 92,
      resetsAt: TUESDAY_0900,
    })
    writeLimits(dirs['.claude-private-3'], fiveHour(10))
    const context = ctx(privateRepo)

    expect(await resolveProfile([], context, batch)).toMatchObject({
      account: { name: 'seat-3', configDir: dirs['.claude-private-3'] },
      selection: { kind: 'auto', threshold: 90 },
    })
    expect(context.err()).toBe(
      'ccprofile: profile "private" → account "seat-3" (≥90%: private five_hour 97% until 14:30; seat-2 seven_day 92% until Tue 09:00)\n'
    )
  })

  it('counts an account without data as not full', async () => {
    writeLimits(dirs['.claude-private'], fiveHour(100))
    const context = ctx(privateRepo)

    expect(await resolveProfile([], context, batch)).toMatchObject({
      account: { name: 'seat-2' },
    })
  })

  it('takes the account free first when all are full', async () => {
    writeLimits(dirs['.claude-private'], fiveHour(100, TUESDAY_0900))
    writeLimits(dirs['.claude-private-2'], fiveHour(95))
    writeLimits(
      dirs['.claude-private-3'],
      fiveHour(99, '2026-10-25T13:00:00.000Z'),
      { kind: 'seven_day', percentUsed: 91, resetsAt: TUESDAY_0900 }
    )
    const context = ctx(privateRepo)

    expect(await resolveProfile([], context, batch)).toMatchObject({
      account: { name: 'seat-2' },
      selection: { kind: 'allFull', freeAt: Date.parse(TODAY_1430) },
    })
    expect(context.err()).toBe(
      'ccprofile: profile "private" → account "seat-2" (all ≥90%, free at 14:30)\n'
    )
  })

  it('reads ~/.claude for the first account of the default profile', async () => {
    writeLimits(dirs['.claude'], fiveHour(95))

    expect(await resolveProfile([], ctx(workRepo), batch)).toMatchObject({
      account: { name: 'work-2', configDir: dirs['.claude-work-2'] },
      selection: { kind: 'auto' },
    })
  })

  it('takes the threshold from the config', async () => {
    await sandbox.writeConfig({ ...CONFIG, accountThreshold: 50 })
    writeLimits(dirs['.claude-private'], fiveHour(60))

    const outcome = await resolveProfile([], ctx(privateRepo), batch)
    await sandbox.writeConfig(CONFIG)

    expect(outcome).toMatchObject({
      account: { name: 'seat-2' },
      selection: { kind: 'auto', threshold: 50 },
    })
  })

  it('lets CCPROFILE_ACCOUNT win over the limit data', async () => {
    writeLimits(dirs['.claude-private'], fiveHour(100))
    const context = ctx(privateRepo, { CCPROFILE_ACCOUNT: 'private' })

    expect(await resolveProfile([], context, batch)).toMatchObject({
      account: { name: 'private' },
      selection: { kind: 'explicit' },
    })
    expect(context.err()).toBe('')
  })

  // Inside a session, CLAUDECODE is set: a nested claude must not jump away
  // from the first account of a profile without configDir (nothing else
  // freezes it there).
  it('keeps the first account for a nested claude', async () => {
    writeLimits(dirs['.claude'], fiveHour(100))
    const context = ctx(workRepo, { CLAUDECODE: '1' })

    expect(await resolveProfile([], context, batch)).toMatchObject({
      account: { name: 'work', configDir: undefined },
      selection: { kind: 'first' },
    })
    expect(context.err()).toBe('')
  })

  it('never chooses by limits for codex', async () => {
    writeLimits(dirs['.claude-private'], fiveHour(100))
    const context = ctx(privateRepo)

    expect(
      await resolveProfile([], context, { ...batch, tool: 'codex' })
    ).toMatchObject({
      account: { name: 'private' },
      selection: { kind: 'first' },
      codexHome: { dir: dirs['.codex-private'] },
    })
    expect(context.err()).toBe('')
  })

  it('announces the account after the onUnknown line', async () => {
    await sandbox.writeConfig({ ...CONFIG, onUnknown: 'private' })
    writeLimits(dirs['.claude-private'], fiveHour(100))
    const context = ctx(sandbox.dir('elsewhere'))

    await resolveProfile([], context, batch)
    await sandbox.writeConfig(CONFIG)

    expect(context.err()).toBe(
      [
        'ccprofile: no match, using "private" (onUnknown)',
        'ccprofile: profile "private" → account "seat-2" (≥90%: private five_hour 100% until 14:30)',
        '',
      ].join('\n')
    )
  })
})
