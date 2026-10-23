import type * as Crypto from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import writeFileAtomic from '../../../src/setup/writeFileAtomic'

const random = vi.hoisted(() => ({ calls: 0 }))

// The first random suffix is fixed, so the test can occupy that temp name.
vi.mock('node:crypto', async importOriginal => {
  const real = await importOriginal<typeof Crypto>()
  return {
    ...real,
    randomBytes: (size: number) =>
      random.calls++ === 0 ? Buffer.alloc(size, 1) : real.randomBytes(size),
  }
})

describe('writeFileAtomic temp file', () => {
  let dir: string

  beforeEach(() => {
    random.calls = 0
    dir = mkdtempSync(join(tmpdir(), 'ccprofile-atomic-temp-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('never reuses an existing temp file; retries with another suffix', async () => {
    const squatter = join(dir, '.rc.010101010101.tmp')
    writeFileSync(squatter, 'squatter')
    const file = join(dir, 'rc')

    await writeFileAtomic(file, 'new')

    expect(readFileSync(file, 'utf8')).toBe('new')
    expect(readFileSync(squatter, 'utf8')).toBe('squatter')
    expect(random.calls).toBe(2)
  })
})
