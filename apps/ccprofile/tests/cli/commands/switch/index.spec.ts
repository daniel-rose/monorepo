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

import SWITCH_FIXTURE from '../../../../mod/tests/switch.fixture'
import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'
import writeLimits from '../../../helpers/writeLimits'

// Sunday, 2026-10-25 12:00 UTC.
const NOW = Date.UTC(2026, 9, 25, 12, 0)

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let dirs: string[] = []

beforeAll(async () => {
  vi.stubEnv('TZ', 'UTC')
  sandbox = await createSandbox()
  dirs = [
    sandbox.dir('.claude-private'),
    sandbox.dir('.claude-private-2'),
    sandbox.dir('.claude-private-3'),
  ]
  await sandbox.writeConfig({
    profiles: [
      { name: 'work', remotes: ['gitlab.example.com'] },
      {
        name: 'private',
        configDir: '~/.claude-private',
        remotes: ['github.com/jane'],
        accounts: [
          { name: 'seat-2', configDir: '~/.claude-private-2' },
          { name: 'seat-3', configDir: '~/.claude-private-3' },
        ],
      },
    ],
  })
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await sandbox.cleanup()
})

afterEach(() => {
  for (const dir of dirs) {
    rmSync(join(dir, 'ccprofile'), { recursive: true, force: true })
  }
})

const FULL = [
  { kind: 'five_hour', percentUsed: 97, resetsAt: '2026-10-25T14:30:00Z' },
]

const switchOf = async (env: Record<string, string>, args = ['--json']) => {
  const ctx = { ...sandbox.ctx(sandbox.home, env), now: () => NOW }
  const code = await run(['switch', ...args], ctx)
  return { code, out: ctx.out(), err: ctx.err() }
}

const planOf = async (env: Record<string, string>) =>
  JSON.parse((await switchOf(env)).out) as unknown

describe('switch', () => {
  it('offers the next account of the first one', async () => {
    expect(
      await switchOf({ CCPROFILE: 'private', CCPROFILE_ACCOUNT: '' })
    ).toEqual({
      code: 0,
      // The line the mod reads (shared fixture).
      out: `${JSON.stringify(SWITCH_FIXTURE.plan)}\n`,
      err: '',
    })
  })

  it('offers the first account from a later one', async () => {
    expect(
      await planOf({ CCPROFILE: 'private', CCPROFILE_ACCOUNT: 'seat-2' })
    ).toMatchObject({ account: 'seat-2', target: 'private' })
  })

  it('passes over full accounts', async () => {
    writeLimits(dirs[1], FULL)

    expect(await switchOf({ CCPROFILE: 'private' }, [])).toEqual({
      code: 0,
      out: 'profile "private": account "private" → "seat-3"\n',
      err: '',
    })
  })

  it('has no target when all other accounts are full', async () => {
    writeLimits(dirs[1], FULL)
    writeLimits(dirs[2], [
      { kind: 'seven_day', percentUsed: 92, resetsAt: '2026-10-27T09:00:00Z' },
    ])

    expect(await planOf({ CCPROFILE: 'private' })).toEqual({
      version: 1,
      profile: 'private',
      account: 'private',
      threshold: 90,
      target: null,
      reason: 'all other accounts ≥90%, free at 14:30',
    })
  })

  it('ignores the limits of the running account', async () => {
    writeLimits(dirs[0], FULL)

    expect(await planOf({ CCPROFILE: 'private' })).toMatchObject({
      target: 'seat-2',
    })
  })

  it('has no target in a profile without accounts', async () => {
    expect(await switchOf({ CCPROFILE: 'work' }, [])).toEqual({
      code: 0,
      out: 'profile "work": account "work", no switch (profile "work" has no other account)\n',
      err: '',
    })
  })

  it('fails outside the hook', async () => {
    expect(await switchOf({})).toEqual({
      code: 1,
      out: '',
      err: 'ccprofile: CCPROFILE is not set – start claude through the ccprofile hook\n',
    })
  })

  it('fails for an unknown account', async () => {
    expect(
      await switchOf({ CCPROFILE: 'private', CCPROFILE_ACCOUNT: 'seat-9' })
    ).toEqual({
      code: 1,
      out: '',
      err: 'ccprofile: unknown account "seat-9" in profile "private"\n',
    })
  })

  it('fails for an unknown profile', async () => {
    expect((await switchOf({ CCPROFILE: 'gone' })).err).toBe(
      'ccprofile: unknown profile "gone"\n'
    )
  })
})
