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

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'
import writeLimits from '../../../helpers/writeLimits'

// Sunday, 2026-10-25 12:00 UTC.
const NOW = Date.UTC(2026, 9, 25, 12, 0)

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let repo = ''
let firstDir = ''
let secondDir = ''

beforeAll(async () => {
  vi.stubEnv('TZ', 'UTC')
  sandbox = await createSandbox()
  repo = await sandbox.repo('p/app', 'git@github.com:jane/app.git')
  firstDir = sandbox.dir('.claude-private')
  secondDir = sandbox.dir('.claude-private-2')
  await sandbox.writeConfig({
    profiles: [
      {
        name: 'private',
        configDir: '~/.claude-private',
        remotes: ['github.com/jane'],
        accounts: [{ name: 'seat-2', configDir: '~/.claude-private-2' }],
      },
    ],
  })
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await sandbox.cleanup()
})

afterEach(() => {
  for (const dir of [firstDir, secondDir]) {
    rmSync(join(dir, 'ccprofile'), { recursive: true, force: true })
  }
})

const statusOf = async (env: Record<string, string> = {}) => {
  const ctx = { ...sandbox.ctx(repo, env), now: () => NOW }
  const code = await run(['status'], ctx)
  return { code, out: ctx.out(), err: ctx.err() }
}

describe('status with limit data', () => {
  it('names the first account without a reason', async () => {
    writeLimits(firstDir, [
      { kind: 'five_hour', percentUsed: 40, resetsAt: '2026-10-25T14:30:00Z' },
    ])

    expect(await statusOf()).toEqual({
      code: 0,
      out: 'private (remote github.com/jane), account private\n',
      err: '',
    })
  })

  it('says why the limit data chose another account', async () => {
    writeLimits(firstDir, [
      { kind: 'five_hour', percentUsed: 97, resetsAt: '2026-10-25T14:30:00Z' },
    ])

    expect(await statusOf()).toEqual({
      code: 0,
      out: 'private (remote github.com/jane), account seat-2 (≥90%: private five_hour 97% until 14:30)\n',
      err: '',
    })
  })

  it('says when all accounts are full', async () => {
    writeLimits(firstDir, [
      { kind: 'five_hour', percentUsed: 97, resetsAt: '2026-10-25T14:30:00Z' },
    ])
    writeLimits(secondDir, [
      { kind: 'seven_day', percentUsed: 91, resetsAt: '2026-10-27T09:00:00Z' },
    ])

    expect((await statusOf()).out).toBe(
      'private (remote github.com/jane), account private (all ≥90%, free at 14:30)\n'
    )
  })

  it('names CCPROFILE_ACCOUNT over the limit data', async () => {
    writeLimits(firstDir, [
      { kind: 'five_hour', percentUsed: 97, resetsAt: '2026-10-25T14:30:00Z' },
    ])

    expect((await statusOf({ CCPROFILE_ACCOUNT: 'private' })).out).toBe(
      'private (remote github.com/jane), account private (CCPROFILE_ACCOUNT)\n'
    )
  })
})
