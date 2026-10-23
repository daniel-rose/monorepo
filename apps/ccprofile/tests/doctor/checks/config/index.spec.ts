import { describe, expect, it } from 'vitest'

import checkConfig from '../../../../src/doctor/checks/config'
import createConfig from '../../../helpers/createConfig'
import createTestContext from '../../../helpers/createTestContext'

describe('checkConfig', () => {
  const ctx = createTestContext()

  it('fails for every issue of an invalid config', async () => {
    const results = await checkConfig(ctx, {
      status: 'invalid',
      path: '/cfg/config.json',
      issues: ['profiles[0].name: required', 'profiles[1].paths: bad'],
    })

    expect(results).toHaveLength(2)
    expect(results.every(result => result.status === 'fail')).toBe(true)
    expect(results[0]?.message).toContain('profiles[0].name: required')
    expect(results[1]?.message).toContain('profiles[1].paths: bad')
  })

  it('warns about a missing config and points to init', async () => {
    const results = await checkConfig(ctx, {
      status: 'missing',
      path: '/cfg/config.json',
    })

    expect(results).toEqual([expect.objectContaining({ status: 'warn' })])
    expect(results[0]?.message).toContain('/cfg/config.json')
    expect(results[0]?.message).toContain('ccprofile init')
  })

  it('is ok for a valid config', async () => {
    const results = await checkConfig(ctx, {
      status: 'ok',
      path: '/cfg/config.json',
      config: createConfig([{ name: 'work' }]),
    })

    expect(results).toEqual([expect.objectContaining({ status: 'ok' })])
    expect(results[0]?.message).toContain('/cfg/config.json')
  })
})
