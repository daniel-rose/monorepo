import { describe, expect, it } from 'vitest'

import checkShadowedSelectors from '../../../../src/doctor/checks/shadowedSelectors'
import createConfig from '../../../helpers/createConfig'
import createTestContext from '../../../helpers/createTestContext'

const ctx = createTestContext({ platform: 'linux' })

describe('checkShadowedSelectors', () => {
  it('does nothing without a config', async () => {
    expect(await checkShadowedSelectors(ctx, null)).toEqual([])
  })

  it('warns when a later remote is covered by an earlier one', async () => {
    const config = createConfig([
      { name: 'broad', remotes: ['github.com/acme'] },
      { name: 'narrow', remotes: ['github.com/acme/secret'] },
    ])

    const results = await checkShadowedSelectors(ctx, config)

    expect(results).toHaveLength(1)
    expect(results[0]?.status).toBe('warn')
    for (const part of [
      'broad',
      'narrow',
      'github.com/acme',
      'github.com/acme/secret',
    ]) {
      expect(results[0]?.message).toContain(part)
    }
  })

  it('warns about an exact duplicate remote across profiles', async () => {
    const config = createConfig([
      { name: 'a', remotes: ['github.com/acme/shop'] },
      { name: 'b', remotes: ['github.com/acme/shop'] },
    ])

    const results = await checkShadowedSelectors(ctx, config)

    expect(results.map(result => result.status)).toEqual(['warn'])
  })

  it('warns when a later path lies below an earlier one', async () => {
    const config = createConfig([
      { name: 'a', paths: ['/work/acme'] },
      { name: 'b', paths: ['/work/acme/secret'] },
    ])

    const results = await checkShadowedSelectors(ctx, config)

    expect(results).toHaveLength(1)
    expect(results[0]?.message).toContain('/work/acme/secret')
  })

  it('is fine when the more specific entry comes first', async () => {
    const config = createConfig([
      { name: 'narrow', remotes: ['github.com/acme/secret'] },
      { name: 'broad', remotes: ['github.com/acme'] },
    ])

    expect(await checkShadowedSelectors(ctx, config)).toEqual([
      expect.objectContaining({ status: 'ok' }),
    ])
  })

  it('does not call same-profile overlaps shadowing', async () => {
    const config = createConfig([
      {
        name: 'a',
        remotes: ['github.com/acme', 'github.com/acme/secret'],
      },
    ])

    expect(await checkShadowedSelectors(ctx, config)).toEqual([
      expect.objectContaining({ status: 'ok' }),
    ])
  })

  it('does not mix up a path and a remote', async () => {
    const config = createConfig([
      { name: 'a', paths: ['/work/acme'] },
      { name: 'b', remotes: ['github.com/acme'] },
    ])

    expect(await checkShadowedSelectors(ctx, config)).toEqual([
      expect.objectContaining({ status: 'ok' }),
    ])
  })
})
