import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import checkMissingPaths from '../../../../src/doctor/checks/missingPaths'
import createConfig from '../../../helpers/createConfig'
import createTestContext from '../../../helpers/createTestContext'

describe('checkMissingPaths', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'ccprofile-paths-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('does nothing without a config', async () => {
    expect(await checkMissingPaths(createTestContext(), null)).toEqual([])
  })

  it('warns for each path entry that does not exist', async () => {
    const present = join(root, 'present')
    mkdirSync(present)
    const gone = join(root, 'gone')
    const config = createConfig([
      { name: 'work', paths: [present, gone] },
      { name: 'private', paths: [join(root, 'also-gone')] },
    ])

    const results = await checkMissingPaths(createTestContext(), config)

    expect(results.map(result => result.status)).toEqual(['warn', 'warn'])
    expect(results[0]?.message).toContain('work')
    expect(results[0]?.message).toContain(gone)
    expect(results[1]?.message).toContain('private')
  })

  it('is ok when every path exists', async () => {
    const present = join(root, 'present')
    mkdirSync(present)

    const results = await checkMissingPaths(
      createTestContext(),
      createConfig([{ name: 'work', paths: [present] }])
    )

    expect(results).toEqual([expect.objectContaining({ status: 'ok' })])
  })
})
