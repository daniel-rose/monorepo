import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import findPackageRoot from '../../../src/context/findPackageRoot'

describe('findPackageRoot', () => {
  it('returns the directory of the ccprofile package.json', () => {
    const root = findPackageRoot()
    const pkg = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8')
    ) as { name: string }

    expect(pkg.name).toBe('@daniel-rose/ccprofile')
  })
})
