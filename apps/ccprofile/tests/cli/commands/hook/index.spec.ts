import { describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import { SHELL } from '../../../../src/constants'
import readHook from '../../../../src/hook/readHook'
import createTestContext from '../../../helpers/createTestContext'

describe('hook', () => {
  it.each(Object.values(SHELL))('prints the %s hook', async shell => {
    const ctx = createTestContext()

    const code = await run(['hook', shell], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(await readHook(shell))
    expect(ctx.err()).toBe('')
  })

  it('exits 1 and lists the valid shells for an unknown shell', async () => {
    const ctx = createTestContext()

    const code = await run(['hook', 'cmd'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toBe(
      'ccprofile: unknown shell "cmd" (valid: zsh, bash, fish, pwsh, powershell)\n'
    )
  })

  it('exits 1 without a shell', async () => {
    const ctx = createTestContext()

    const code = await run(['hook'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toBe('')
    expect(ctx.err()).toContain("missing required argument 'shell'")
  })
})
