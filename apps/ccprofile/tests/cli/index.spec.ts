import { describe, expect, it } from 'vitest'

import run from '../../src/cli'
import readPackageVersion from '../../src/context/readPackageVersion'
import createTestContext from '../helpers/createTestContext'

describe('run', () => {
  it.each(['-v', '--version'])(
    'prints the package version for %s',
    async flag => {
      const ctx = createTestContext()

      const code = await run([flag], ctx)

      expect(code).toBe(0)
      expect(ctx.out()).toBe(readPackageVersion() + '\n')
    }
  )

  it('prints help for -h', async () => {
    const ctx = createTestContext()

    const code = await run(['-h'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toContain('Usage: ccprofile')
    expect(ctx.out()).toContain('Usage: ccprofile [options] [command]\n')
    expect(ctx.out()).toContain('resolve')
    expect(ctx.err()).toBe('')
  })

  it('exits 1 for an unknown command', async () => {
    const ctx = createTestContext()

    const code = await run(['nope'], ctx)

    expect(code).toBe(1)
    expect(ctx.err()).toContain('unknown command')
  })
})
