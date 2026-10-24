import { describe, expect, it } from 'vitest'

import type { RunCommandResult } from '../../../../src/context/types'
import checkLogin from '../../../../src/doctor/checks/login'
import createConfig from '../../../helpers/createConfig'
import createTestContext from '../../../helpers/createTestContext'

const result = (overrides: Partial<RunCommandResult>): RunCommandResult => ({
  exitCode: 0,
  stdout: '',
  stderr: '',
  timedOut: false,
  notFound: false,
  ...overrides,
})

const config = createConfig([
  { name: 'work', configDir: '/home/jane/.claude-work' },
  { name: 'private' },
])

describe('checkLogin', () => {
  it('does nothing without a config', async () => {
    expect(await checkLogin(createTestContext(), null)).toEqual([])
  })

  it('is ok with the email when logged in', async () => {
    const ctx = createTestContext({
      runCommand: () =>
        Promise.resolve(
          result({
            stdout: JSON.stringify({
              loggedIn: true,
              email: 'jane@example.test',
            }),
          })
        ),
    })

    const results = await checkLogin(ctx, createConfig([{ name: 'work' }]))

    expect(results).toEqual([expect.objectContaining({ status: 'ok' })])
    expect(results[0]?.message).toContain('work')
    expect(results[0]?.message).toContain('jane@example.test')
  })

  it('is ok without an email when none is reported', async () => {
    const ctx = createTestContext({
      runCommand: () =>
        Promise.resolve(result({ stdout: '{"loggedIn":true}' })),
    })

    const [check] = await checkLogin(ctx, createConfig([{ name: 'work' }]))

    expect(check?.status).toBe('ok')
  })

  it('warns when logged out', async () => {
    const ctx = createTestContext({
      runCommand: () =>
        Promise.resolve(result({ exitCode: 1, stdout: '{"loggedIn":false}' })),
    })

    const [check] = await checkLogin(ctx, createConfig([{ name: 'work' }]))

    expect(check?.status).toBe('warn')
    expect(check?.message).toContain('work')
  })

  it('warns on a timeout', async () => {
    const ctx = createTestContext({
      runCommand: () => Promise.resolve(result({ timedOut: true })),
    })

    const [check] = await checkLogin(ctx, createConfig([{ name: 'work' }]))

    expect(check?.status).toBe('warn')
    expect(check?.message).toContain('timeout')
  })

  it('warns when the output is unreadable', async () => {
    const ctx = createTestContext({
      runCommand: () => Promise.resolve(result({ stdout: 'nonsense' })),
    })

    const [check] = await checkLogin(ctx, createConfig([{ name: 'work' }]))

    expect(check?.status).toBe('warn')
  })

  it('stays silent when claude is missing (reported once by the PATH check)', async () => {
    const ctx = createTestContext({
      runCommand: () => Promise.resolve(result({ notFound: true })),
    })

    expect(await checkLogin(ctx, config)).toEqual([])
  })

  it('reports every further account with its own CLAUDE_CONFIG_DIR', async () => {
    const dirs: (string | undefined)[] = []
    const ctx = createTestContext({
      runCommand: (_file, _args, options) => {
        dirs.push(options?.env?.CLAUDE_CONFIG_DIR)
        return Promise.resolve(result({ stdout: '{"loggedIn":true}' }))
      },
    })
    const withAccounts = createConfig([
      {
        name: 'private',
        configDir: '/home/jane/.claude-private',
        accounts: [{ name: 'seat-2', configDir: '/home/jane/.claude-p2' }],
      },
    ])

    const results = await checkLogin(ctx, withAccounts)

    expect(dirs).toEqual([
      '/home/jane/.claude-private',
      '/home/jane/.claude-p2',
    ])
    expect(results.map(check => check.message)).toEqual([
      'profile private: logged in',
      'profile private, account seat-2: logged in',
    ])
  })

  it('queries every profile in parallel with its own CLAUDE_CONFIG_DIR', async () => {
    const started: (string | undefined)[] = []
    const releases: (() => void)[] = []
    const ctx = createTestContext({
      runCommand: (_file, _args, options) => {
        started.push(options?.env?.CLAUDE_CONFIG_DIR)
        return new Promise<RunCommandResult>(resolve => {
          releases.push(() => resolve(result({ stdout: '{"loggedIn":true}' })))
        })
      },
    })

    const pending = checkLogin(ctx, config)
    await new Promise(resolve => setTimeout(resolve, 20))

    // Both calls are in flight before either one finished.
    expect(started).toEqual(['/home/jane/.claude-work', undefined])
    for (const release of releases) release()
    const results = await pending

    expect(results.map(check => check.status)).toEqual(['ok', 'ok'])
    expect(results[0]?.message).toContain('work')
    expect(results[1]?.message).toContain('private')
  })
})
