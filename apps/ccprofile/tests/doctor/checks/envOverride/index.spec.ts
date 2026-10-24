import { describe, expect, it } from 'vitest'

import checkEnvOverride from '../../../../src/doctor/checks/envOverride'
import createTestContext from '../../../helpers/createTestContext'

describe('checkEnvOverride', () => {
  it('warns when CLAUDE_CONFIG_DIR is set in the current shell', async () => {
    const ctx = createTestContext({ env: { CLAUDE_CONFIG_DIR: '/x' } })

    const results = await checkEnvOverride(ctx, null)

    expect(results).toEqual([expect.objectContaining({ status: 'warn' })])
    expect(results[0]?.message).toContain('CLAUDE_CONFIG_DIR')
    expect(results[0]?.message).toContain('bypasses')
  })

  it('warns when CCPROFILE is set', async () => {
    const ctx = createTestContext({ env: { CCPROFILE: 'work' } })

    const results = await checkEnvOverride(ctx, null)

    expect(results[0]?.message).toContain('CCPROFILE')
  })

  it('warns when CODEX_HOME is set', async () => {
    const ctx = createTestContext({ env: { CODEX_HOME: '/x' } })

    const [check] = await checkEnvOverride(ctx, null)

    expect(check?.status).toBe('warn')
    expect(check?.message).toContain('CODEX_HOME')
  })

  it('names both variables when both are set', async () => {
    const ctx = createTestContext({
      env: { CCPROFILE: 'work', CLAUDE_CONFIG_DIR: '/x' },
    })

    const [check] = await checkEnvOverride(ctx, null)

    expect(check?.message).toContain('CCPROFILE')
    expect(check?.message).toContain('CLAUDE_CONFIG_DIR')
  })

  it('treats empty values as unset', async () => {
    const ctx = createTestContext({
      env: { CCPROFILE: '', CLAUDE_CONFIG_DIR: '' },
    })

    expect(await checkEnvOverride(ctx, null)).toEqual([])
  })
})
