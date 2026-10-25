import { describe, expect, it } from 'vitest'

import pickAccount from '../../../src/limits/pickAccount'
import type { Assessment } from '../../../src/limits/types'

const free: Assessment = { isFull: false }

const windowsUntil = (freeAt: number) => [
  { kind: 'five_hour', percentUsed: 95, resetsAt: freeAt },
]

const full = (freeAt: number): Assessment => ({
  isFull: true,
  windows: windowsUntil(freeAt),
  freeAt,
})

const candidates = (...assessments: Assessment[]) =>
  assessments.map((assessment, index) => ({
    name: `acct-${index + 1}`,
    assessment,
  }))

describe('pickAccount', () => {
  it('takes the first account when it is not full', () => {
    expect(pickAccount(candidates(free, full(5)), 90)).toEqual({
      index: 0,
      selection: { kind: 'first' },
    })
  })

  it('takes the first account that is not full, naming the skipped ones', () => {
    expect(pickAccount(candidates(full(7), full(5), free, free), 90)).toEqual({
      index: 2,
      selection: {
        kind: 'auto',
        threshold: 90,
        skipped: [
          { name: 'acct-1', windows: windowsUntil(7), freeAt: 7 },
          { name: 'acct-2', windows: windowsUntil(5), freeAt: 5 },
        ],
      },
    })
  })

  it('takes the account free first when all are full', () => {
    expect(pickAccount(candidates(full(7), full(5), full(6)), 90)).toEqual({
      index: 1,
      selection: { kind: 'allFull', threshold: 90, freeAt: 5 },
    })
  })

  it('breaks a tie in config order', () => {
    expect(pickAccount(candidates(full(7), full(5), full(5)), 80)).toEqual({
      index: 1,
      selection: { kind: 'allFull', threshold: 80, freeAt: 5 },
    })
  })
})
