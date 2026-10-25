import { describe, expect, it } from 'vitest'

import assessLimits from '../../../src/limits/assessLimits'
import type { LimitWindow } from '../../../src/limits/types'

const NOW = Date.UTC(2026, 9, 25, 12, 0)
const HOUR = 3_600_000

const ok = (...windows: LimitWindow[]) =>
  ({ status: 'ok', seenAt: NOW, windows }) as const

const window = (
  kind: string,
  percentUsed: number,
  resetsAt: number | undefined
): LimitWindow => ({ kind, percentUsed, resetsAt })

describe('assessLimits', () => {
  it('is not full below the threshold', () => {
    expect(
      assessLimits(ok(window('five_hour', 89.9, NOW + HOUR)), 90, NOW)
    ).toEqual({ isFull: false })
  })

  it('is full at the threshold, free at the reset', () => {
    expect(
      assessLimits(ok(window('five_hour', 90, NOW + HOUR)), 90, NOW)
    ).toEqual({
      isFull: true,
      windows: [{ kind: 'five_hour', percentUsed: 90, resetsAt: NOW + HOUR }],
      freeAt: NOW + HOUR,
    })
  })

  it('is free only after the latest reset of its full windows', () => {
    const assessment = assessLimits(
      ok(
        window('five_hour', 100, NOW + HOUR),
        window('seven_day', 95, NOW + 50 * HOUR),
        window('spend_limit', 10, NOW + 2 * HOUR)
      ),
      90,
      NOW
    )

    expect(assessment).toMatchObject({
      isFull: true,
      freeAt: NOW + 50 * HOUR,
      windows: [{ kind: 'five_hour' }, { kind: 'seven_day' }],
    })
  })

  it('counts a window whose reset has passed (or is now) as 0 %', () => {
    expect(
      assessLimits(
        ok(window('five_hour', 100, NOW), window('seven_day', 99, NOW - 1)),
        90,
        NOW
      )
    ).toEqual({ isFull: false })
  })

  // A skipped account is never measured again: a window without a reset
  // would keep it full forever.
  it('ignores a window without a reset', () => {
    expect(
      assessLimits(ok(window('spend_limit', 120, undefined)), 90, NOW)
    ).toEqual({ isFull: false })
  })

  it.each([
    { status: 'missing' },
    { status: 'invalid' },
    { status: 'unsupported', version: 2 },
  ] as const)('never counts $status as full', reading => {
    expect(assessLimits(reading, 90, NOW)).toEqual({ isFull: false })
  })
})
