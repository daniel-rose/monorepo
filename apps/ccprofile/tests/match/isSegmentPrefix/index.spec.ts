import { describe, expect, it } from 'vitest'

import isSegmentPrefix from '../../../src/match/isSegmentPrefix'

const posix = { separator: '/', caseInsensitive: false } as const
const win = { separator: '\\', caseInsensitive: true } as const

describe('isSegmentPrefix', () => {
  it('matches equal values and whole-segment prefixes', () => {
    expect(isSegmentPrefix('a/b', 'a/b', posix)).toBe(true)
    expect(isSegmentPrefix('a/b', 'a/b/c', posix)).toBe(true)
  })

  it('does not match partial segments or longer prefixes', () => {
    expect(isSegmentPrefix('a/b', 'a/bc', posix)).toBe(false)
    expect(isSegmentPrefix('a/b/c', 'a/b', posix)).toBe(false)
  })

  it('ignores trailing separators on both sides', () => {
    expect(isSegmentPrefix('a/b/', 'a/b', posix)).toBe(true)
    expect(isSegmentPrefix('a/b', 'a/b/', posix)).toBe(true)
  })

  it('treats a root prefix as matching everything below it', () => {
    expect(isSegmentPrefix('/', '/x', posix)).toBe(true)
    expect(isSegmentPrefix('/', '/', posix)).toBe(true)
    expect(isSegmentPrefix('C:\\', 'C:\\x', win)).toBe(true)
  })

  it('never matches an empty prefix', () => {
    expect(isSegmentPrefix('', 'a', posix)).toBe(false)
  })

  it('honours caseInsensitive', () => {
    expect(isSegmentPrefix('A/B', 'a/b/c', posix)).toBe(false)
    expect(isSegmentPrefix('A\\B', 'a\\b\\c', win)).toBe(true)
  })
})
