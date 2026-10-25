import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'
import writeLimits from '../../../helpers/writeLimits'

// Sunday, 2026-10-25 12:00 UTC.
const NOW = Date.UTC(2026, 9, 25, 12, 0)

const CONFIG = {
  profiles: [
    {
      name: 'work',
      remotes: ['gitlab.example.com'],
      accounts: [
        { name: 'work-2', configDir: '~/.claude-work-2' },
        { name: 'work-3', configDir: '~/.claude-work-3' },
        { name: 'work-4', configDir: '~/.claude-work-4' },
      ],
    },
    { name: 'private', configDir: '~/.claude-private', paths: ['~/p'] },
  ],
}

const listWith = async (
  write: (dir: (name: string) => string) => void
): Promise<{ out: string; home: string }> => {
  const sandbox = await createSandbox()
  await sandbox.writeConfig(CONFIG)
  write(name => sandbox.dir(name))
  const ctx = { ...sandbox.ctx(sandbox.dir('x')), now: () => NOW }

  await run(['list'], ctx)
  await sandbox.cleanup()
  return { out: ctx.out(), home: sandbox.home }
}

describe('list with limit data', () => {
  it('shows the last reading of every account once one has data', async () => {
    const { out, home } = await listWith(dir => {
      writeLimits(dir('.claude'), [
        {
          kind: 'five_hour',
          percentUsed: 42.5,
          resetsAt: '2026-10-25T14:30:00Z',
        },
        {
          kind: 'seven_day',
          percentUsed: 80,
          resetsAt: '2026-10-27T09:00:00Z',
        },
        { kind: 'spend_limit', percentUsed: 12 },
      ])
      writeLimits(dir('.claude-work-2'), [
        {
          kind: 'five_hour',
          percentUsed: 100,
          resetsAt: '2026-10-25T11:00:00Z',
        },
      ])
      writeLimits(dir('.claude-work-3'), '{"version":1')
      writeLimits(dir('.claude-work-4'), '{"version":2}')
    })

    expect(out).toBe(
      [
        '[work]',
        '  configDir: ~/.claude (default)',
        '  shared source: ~/.claude (default)',
        '  account: work (~/.claude (default)) – 5h 42.5% · 7d 80% · spend_limit 12%',
        `  account: work-2 (${join(home, '.claude-work-2')}) – 5h reset`,
        `  account: work-3 (${join(home, '.claude-work-3')}) – limits.json invalid`,
        `  account: work-4 (${join(home, '.claude-work-4')}) – limits.json version 2 unsupported`,
        '  remote: gitlab.example.com',
        '[private]',
        `  configDir: ${join(home, '.claude-private')}`,
        `  path: ${join(home, 'p')}`,
        'onUnknown: prompt',
        '',
      ].join('\n')
    )
  })

  it('marks accounts without a file as no data', async () => {
    const { out } = await listWith(dir => {
      writeLimits(dir('.claude-work-3'), [
        { kind: 'five_hour', percentUsed: 5, resetsAt: '2026-10-25T14:30:00Z' },
      ])
    })

    expect(out).toContain('  account: work (~/.claude (default)) – no data\n')
    expect(out).toContain('.claude-work-2) – no data\n')
    expect(out).toContain('.claude-work-3) – 5h 5%\n')
  })

  it('leaves the account lines alone without any limit file', async () => {
    const { out, home } = await listWith(() => undefined)

    expect(out).toContain(
      [
        '  shared source: ~/.claude (default)',
        `  account: work-2 (${join(home, '.claude-work-2')})`,
        `  account: work-3 (${join(home, '.claude-work-3')})`,
        `  account: work-4 (${join(home, '.claude-work-4')})`,
        '  remote: gitlab.example.com',
      ].join('\n')
    )
  })
})
