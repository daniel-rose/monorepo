import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'

describe('list with codex', () => {
  it('shows the codex home of every profile and the codex accounts', async () => {
    const sandbox = await createSandbox()
    await sandbox.writeConfig({
      profiles: [
        {
          name: 'work',
          remotes: ['gitlab.example.com'],
          accounts: [{ name: 'work-2', configDir: '~/.claude-work-2' }],
        },
        {
          name: 'private',
          configDir: '~/.claude-private',
          codex: { home: '~/.codex-private' },
          paths: ['~/Projects/private'],
          accounts: [
            {
              name: 'seat-2',
              configDir: '~/.claude-private-2',
              codex: { home: '~/.codex-private-2' },
            },
            { name: 'seat-3', configDir: '~/.claude-private-3' },
          ],
        },
      ],
    })
    const ctx = sandbox.ctx(sandbox.dir('x'))
    const at = (name: string) => join(sandbox.home, name)

    const code = await run(['list'], ctx)
    await sandbox.cleanup()

    expect(code).toBe(0)
    expect(ctx.out()).toBe(
      [
        '[work]',
        '  configDir: ~/.claude (default)',
        '  shared source: ~/.claude (default)',
        `  account: work-2 (${at('.claude-work-2')})`,
        '  codex: ~/.codex (default)',
        '  codex account: work-2 (~/.codex (default))',
        '  remote: gitlab.example.com',
        '[private]',
        `  configDir: ${at('.claude-private')}`,
        `  shared source: ${at('.claude-private')}`,
        `  account: seat-2 (${at('.claude-private-2')})`,
        `  account: seat-3 (${at('.claude-private-3')})`,
        `  codex: ${at('.codex-private')}`,
        `  codex account: seat-2 (${at('.codex-private-2')})`,
        '  codex account: seat-3 (from profile)',
        `  path: ${join(sandbox.home, 'Projects', 'private')}`,
        'onUnknown: prompt',
        '',
      ].join('\n')
    )
  })

  it('prints no codex lines when no profile uses codex', async () => {
    const sandbox = await createSandbox()
    await sandbox.writeConfig({
      profiles: [{ name: 'work', remotes: ['gitlab.example.com'] }],
    })
    const ctx = sandbox.ctx(sandbox.dir('x'))

    await run(['list'], ctx)
    await sandbox.cleanup()

    expect(ctx.out()).not.toContain('codex')
  })
})
