import { describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import locateConfig from '../../../../src/config/locateConfig'
import createTestContext from '../../../helpers/createTestContext'

describe('config', () => {
  it('prints the config path', async () => {
    const ctx = createTestContext()

    const code = await run(['config'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toBe(`${locateConfig(ctx)}\n`)
  })

  it('honors CCPROFILE_CONFIG', async () => {
    const ctx = createTestContext({
      env: { CCPROFILE_CONFIG: '/etc/ccprofile.json' },
    })

    await run(['config'], ctx)

    expect(ctx.out()).toBe('/etc/ccprofile.json\n')
  })
})
