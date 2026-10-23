import { describe, expect, it } from 'vitest'

import type { RunCommandResult } from '../../../../src/context/types'
import checkClaudeOnPath from '../../../../src/doctor/checks/claudeOnPath'
import createTestContext from '../../../helpers/createTestContext'

const result = (overrides: Partial<RunCommandResult>): RunCommandResult => ({
  exitCode: 0,
  stdout: '',
  stderr: '',
  timedOut: false,
  notFound: false,
  ...overrides,
})

describe('checkClaudeOnPath', () => {
  it('fails when claude is not on the PATH', async () => {
    const ctx = createTestContext({
      runCommand: () => Promise.resolve(result({ notFound: true })),
    })

    expect(await checkClaudeOnPath(ctx, null)).toEqual([
      expect.objectContaining({ status: 'fail' }),
    ])
  })

  it('warns when claude --version exits with an error', async () => {
    const ctx = createTestContext({
      runCommand: () =>
        Promise.resolve(
          result({ exitCode: 126, stderr: 'permission denied\nsecond\n' })
        ),
    })

    const [check] = await checkClaudeOnPath(ctx, null)

    expect(check?.status).toBe('warn')
    expect(check?.message).toContain('permission denied')
    expect(check?.message).not.toContain('second')
  })

  it('warns when claude --version was killed by a signal', async () => {
    const ctx = createTestContext({
      runCommand: () => Promise.resolve(result({ exitCode: null })),
    })

    const [check] = await checkClaudeOnPath(ctx, null)

    expect(check?.status).toBe('warn')
  })

  it('warns when claude --version does not answer in time', async () => {
    const ctx = createTestContext({
      runCommand: () =>
        Promise.resolve(result({ exitCode: null, timedOut: true })),
    })

    const [check] = await checkClaudeOnPath(ctx, null)

    expect(check?.status).toBe('warn')
    expect(check?.message).toContain('in time')
  })

  it('is ok and shows the first line of the version output', async () => {
    const calls: unknown[][] = []
    const ctx = createTestContext({
      runCommand: (...args) => {
        calls.push(args)
        return Promise.resolve(
          result({ stdout: '2.1.0 (Claude Code)\nsecond line\n' })
        )
      },
    })

    const [check] = await checkClaudeOnPath(ctx, null)

    expect(check?.status).toBe('ok')
    expect(check?.message).toContain('2.1.0 (Claude Code)')
    expect(check?.message).not.toContain('second line')
    expect(calls[0]?.slice(0, 2)).toEqual(['claude', ['--version']])
  })

  it('is ok without a version when claude prints nothing', async () => {
    const ctx = createTestContext({
      runCommand: () => Promise.resolve(result({})),
    })

    expect(await checkClaudeOnPath(ctx, null)).toEqual([
      expect.objectContaining({ status: 'ok' }),
    ])
  })
})
