import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import checkLimits from '../../../../src/doctor/checks/limits'
import createConfig from '../../../helpers/createConfig'
import createTestContext from '../../../helpers/createTestContext'
import writeLimits from '../../../helpers/writeLimits'

const WINDOW = {
  kind: 'five_hour',
  percentUsed: 10,
  resetsAt: '2026-10-25T14:30:00Z',
}

let home = ''

const config = () =>
  createConfig([
    {
      name: 'work',
      accounts: [
        { name: 'work-2', configDir: join(home, '.claude-work-2') },
        { name: 'work-3', configDir: join(home, '.claude-work-3') },
      ],
    },
    { name: 'private', configDir: join(home, '.claude-private') },
  ])

const check = () =>
  checkLimits(
    createTestContext({ homedir: home, platform: process.platform }),
    config()
  )

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'ccprofile-doctor-limits-'))
})

afterEach(() => rmSync(home, { recursive: true, force: true }))

describe('checkLimits', () => {
  it('does nothing without a config', async () => {
    expect(await checkLimits(createTestContext(), null)).toEqual([])
  })

  it('warns when no account of a profile has a limit file', async () => {
    expect(await check()).toEqual([
      {
        status: 'warn',
        message:
          'profile work: no limit data from any account (ccprofile mod not installed?)',
      },
    ])
  })

  it('counts the accounts with data, the first one included', async () => {
    writeLimits(join(home, '.claude'), [WINDOW])
    writeLimits(join(home, '.claude-work-3'), [WINDOW])

    expect(await check()).toEqual([
      {
        status: 'ok',
        message: 'profile work: limit data from 2 of 3 accounts',
      },
    ])
  })

  it('names broken and newer files per account', async () => {
    writeLimits(join(home, '.claude'), [WINDOW])
    writeLimits(join(home, '.claude-work-2'), 'not json')
    writeLimits(join(home, '.claude-work-3'), '{"version":3}')

    expect(await check()).toEqual([
      {
        status: 'ok',
        message: 'profile work: limit data from 1 of 3 accounts',
      },
      {
        status: 'warn',
        message: 'profile work, account work-2: limits.json invalid',
      },
      {
        status: 'warn',
        message:
          'profile work, account work-3: limits.json version 3 unsupported – update ccprofile and the ccprofile mod',
      },
    ])
  })

  it('warns when the only files are broken', async () => {
    writeLimits(join(home, '.claude-work-2'), 'not json')

    expect(await check()).toEqual([
      {
        status: 'warn',
        message: 'profile work: limit data from 0 of 3 accounts',
      },
      {
        status: 'warn',
        message: 'profile work, account work-2: limits.json invalid',
      },
    ])
  })
})
