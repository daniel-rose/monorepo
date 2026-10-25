import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import formatResetTime from '../../../src/limits/formatResetTime'

// Sunday, 2026-10-25 12:00 UTC.
const NOW = Date.UTC(2026, 9, 25, 12, 0)

beforeAll(() => {
  vi.stubEnv('TZ', 'UTC')
})

afterAll(() => {
  vi.unstubAllEnvs()
})

describe('formatResetTime', () => {
  it('prints the time of a reset today', () => {
    expect(formatResetTime(Date.UTC(2026, 9, 25, 14, 30), NOW)).toBe('14:30')
  })

  it('pads hours and minutes', () => {
    expect(formatResetTime(Date.UTC(2026, 9, 25, 13, 5), NOW)).toBe('13:05')
  })

  it('adds the weekday for a reset on another day', () => {
    expect(formatResetTime(Date.UTC(2026, 9, 27, 9, 0), NOW)).toBe('Tue 09:00')
  })

  it('uses local time', () => {
    vi.stubEnv('TZ', 'Europe/Berlin')

    expect(formatResetTime(Date.UTC(2026, 9, 25, 22, 30), NOW)).toBe('23:30')
    expect(formatResetTime(Date.UTC(2026, 9, 25, 23, 30), NOW)).toBe(
      'Mon 00:30'
    )

    vi.stubEnv('TZ', 'UTC')
  })
})
