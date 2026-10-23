import { describe, expect, it, vi } from 'vitest'

import checkSchemaMajor from '../../../../src/doctor/checks/schemaMajor'
import createConfig from '../../../helpers/createConfig'
import createTestContext from '../../../helpers/createTestContext'

vi.mock('../../../../src/context/readPackageVersion', () => ({
  default: () => '1.4.2',
}))

const ctx = createTestContext()
const schema = (major: number) =>
  `https://unpkg.com/@daniel-rose/ccprofile@${major}/schema.json`

describe('checkSchemaMajor', () => {
  it('does nothing without a config or without $schema', async () => {
    expect(await checkSchemaMajor(ctx, null)).toEqual([])
    expect(await checkSchemaMajor(ctx, createConfig([]))).toEqual([])
  })

  it('warns when the $schema major differs from the installed one', async () => {
    const results = await checkSchemaMajor(ctx, createConfig([], schema(0)))

    expect(results).toEqual([expect.objectContaining({ status: 'warn' })])
    expect(results[0]?.message).toContain('@0')
    expect(results[0]?.message).toContain('1.4.2')
  })

  it('is ok when the majors match', async () => {
    expect(await checkSchemaMajor(ctx, createConfig([], schema(1)))).toEqual([
      expect.objectContaining({ status: 'ok' }),
    ])
  })

  it('ignores a $schema that is not an unpkg-style URL', async () => {
    const config = createConfig([], 'file:///somewhere/schema.json')

    expect(await checkSchemaMajor(ctx, config)).toEqual([])
  })
})
