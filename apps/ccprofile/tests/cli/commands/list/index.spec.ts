import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'

describe('list', () => {
  it('lists the profiles in match order, then onUnknown', async () => {
    const sandbox = await createSandbox()
    await sandbox.writeConfig({
      profiles: [
        { name: 'work', remotes: ['gitlab.example.com', 'git.example.org'] },
        {
          name: 'private',
          configDir: '~/.claude-private',
          paths: ['~/Projects/private'],
        },
      ],
    })
    const ctx = sandbox.ctx(sandbox.dir('x'))

    const code = await run(['list'], ctx)
    await sandbox.cleanup()

    expect(code).toBe(0)
    expect(ctx.out()).toBe(
      [
        '[work]',
        '  configDir: ~/.claude (default)',
        '  remote: gitlab.example.com',
        '  remote: git.example.org',
        '[private]',
        `  configDir: ${join(sandbox.home, '.claude-private')}`,
        `  path: ${join(sandbox.home, 'Projects', 'private')}`,
        'onUnknown: prompt',
        '',
      ].join('\n')
    )
    expect(ctx.err()).toBe('')
  })

  it('lists the accounts after the first one', async () => {
    const sandbox = await createSandbox()
    await sandbox.writeConfig({
      profiles: [
        {
          name: 'work',
          remotes: ['gitlab.example.com'],
          accounts: [{ name: 'work-2', configDir: '~/.claude-work-2' }],
        },
      ],
    })
    const ctx = sandbox.ctx(sandbox.dir('x'))

    await run(['list'], ctx)
    await sandbox.cleanup()

    expect(ctx.out()).toBe(
      [
        '[work]',
        '  configDir: ~/.claude (default)',
        '  shared source: ~/.claude (default)',
        `  account: work-2 (${join(sandbox.home, '.claude-work-2')})`,
        '  remote: gitlab.example.com',
        'onUnknown: prompt',
        '',
      ].join('\n')
    )
  })

  it('prints the configured onUnknown', async () => {
    const sandbox = await createSandbox()
    await sandbox.writeConfig({
      onUnknown: 'work',
      profiles: [{ name: 'work' }],
    })
    const ctx = sandbox.ctx(sandbox.dir('x'))

    await run(['list'], ctx)
    await sandbox.cleanup()

    expect(ctx.out().endsWith('onUnknown: work\n')).toBe(true)
  })

  it('reports a missing config', async () => {
    const sandbox = await createSandbox()
    const ctx = sandbox.ctx(sandbox.dir('x'))

    const code = await run(['list'], ctx)
    await sandbox.cleanup()

    expect(code).toBe(0)
    expect(ctx.out()).toBe(
      `no profiles configured (${join(sandbox.home, '.config', 'ccprofile', 'config.json')})\n`
    )
  })

  it('exits 1 with the issues for an invalid config', async () => {
    const sandbox = await createSandbox()
    await sandbox.writeConfig('{')
    const ctx = sandbox.ctx(sandbox.dir('x'))

    const code = await run(['list'], ctx)
    await sandbox.cleanup()

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toMatch(/^ccprofile: invalid config .+\nccprofile: {3}/)
  })
})
