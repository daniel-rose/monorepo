import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import LIMITS_FIXTURE from '../../../mod/tests/limits.fixture'
import readLimits from '../../../src/limits/readLimits'

let root = ''
let configDir = ''

const ctx = () => ({ homedir: root, platform: process.platform })

const writeLimits = (text: string, dir = configDir) => {
  mkdirSync(join(dir, 'ccprofile'), { recursive: true })
  writeFileSync(join(dir, 'ccprofile', 'limits.json'), text)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ccprofile-limits-'))
  configDir = join(root, '.claude-private-2')
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('readLimits', () => {
  // The other half of the mod test: the mod writes exactly this file.
  it('reads the file the mod writes', async () => {
    writeLimits(JSON.stringify(LIMITS_FIXTURE.file))

    expect(await readLimits(configDir, ctx())).toEqual({
      status: 'ok',
      seenAt: LIMITS_FIXTURE.measuredAt,
      windows: [
        {
          kind: 'five_hour',
          percentUsed: 42.5,
          resetsAt: Date.parse('2026-10-25T14:30:00.000Z'),
        },
        {
          kind: 'seven_day',
          percentUsed: 80,
          resetsAt: Date.parse('2026-10-27T09:00:00.000Z'),
        },
        { kind: 'spend_limit', percentUsed: 12, resetsAt: undefined },
      ],
    })
  })

  it('reads ~/.claude for the first account of the default profile', async () => {
    writeLimits(JSON.stringify(LIMITS_FIXTURE.file), join(root, '.claude'))

    expect(await readLimits(undefined, ctx())).toMatchObject({ status: 'ok' })
  })

  it('reports a missing file, also below a missing configDir', async () => {
    expect(await readLimits(configDir, ctx())).toEqual({ status: 'missing' })
  })

  it('reports text that stays broken as invalid', async () => {
    writeLimits('{"version":1,"seenAt"')

    expect(await readLimits(configDir, ctx())).toEqual({ status: 'invalid' })
  })

  it('reports another version as unsupported', async () => {
    writeLimits(JSON.stringify({ ...LIMITS_FIXTURE.file, version: 2 }))

    expect(await readLimits(configDir, ctx())).toEqual({
      status: 'unsupported',
      version: 2,
    })
  })

  it.each([
    ['no version', { seenAt: '2026-10-25T12:00:00.000Z', rateLimits: [] }],
    ['a seenAt that is no date', { ...LIMITS_FIXTURE.file, seenAt: 'soon' }],
    [
      'a percentUsed that is no number',
      {
        ...LIMITS_FIXTURE.file,
        rateLimits: [{ kind: 'five_hour', percentUsed: '42' }],
      },
    ],
    ['rateLimits that are no list', { ...LIMITS_FIXTURE.file, rateLimits: {} }],
    ['no object', [1]],
  ])('treats %s as invalid', async (_, content) => {
    writeLimits(JSON.stringify(content))

    expect(await readLimits(configDir, ctx())).toEqual({ status: 'invalid' })
  })

  it('reads a resetsAt that is no date as absent, extra fields as fine', async () => {
    writeLimits(
      JSON.stringify({
        ...LIMITS_FIXTURE.file,
        writer: 'mod 2',
        rateLimits: [
          { kind: 'five_hour', percentUsed: 95, resetsAt: 'later', extra: 1 },
        ],
      })
    )

    expect(await readLimits(configDir, ctx())).toMatchObject({
      status: 'ok',
      windows: [{ kind: 'five_hour', percentUsed: 95, resetsAt: undefined }],
    })
  })

  it('reports a directory in place of the file as invalid', async () => {
    mkdirSync(join(configDir, 'ccprofile', 'limits.json'), { recursive: true })

    expect(await readLimits(configDir, ctx())).toEqual({ status: 'invalid' })
  })
})
