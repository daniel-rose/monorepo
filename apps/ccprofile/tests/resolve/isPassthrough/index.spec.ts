import { describe, expect, it } from 'vitest'

import { DEFAULT_PASSTHROUGH } from '../../../src/constants'
import isPassthrough from '../../../src/resolve/isPassthrough'

describe('isPassthrough', () => {
  it.each([
    { args: ['--version'], list: ['--version'], expected: true },
    { args: ['-p', '--version'], list: ['--version'], expected: true },
    { args: ['--', '--version'], list: ['--version'], expected: false },
    { args: ['a', '-x'], list: ['-x'], expected: true },
    { args: ['a', '--', '-x'], list: ['-x'], expected: false },
    { args: ['mcp', 'list'], list: ['mcp'], expected: true },
    { args: ['list', 'mcp'], list: ['mcp'], expected: false },
    { args: ['--version'], list: ['mcp'], expected: false },
    { args: [], list: ['mcp', '-x'], expected: false },
  ])('$args with $list -> $expected', ({ args, list, expected }) => {
    expect(isPassthrough(args, list)).toBe(expected)
  })

  it('matches the default list only as first argument for words', () => {
    expect(isPassthrough(['update'], DEFAULT_PASSTHROUGH)).toBe(true)
    expect(isPassthrough(['-p', 'update'], DEFAULT_PASSTHROUGH)).toBe(false)
    expect(isPassthrough(['-p', 'hi', '-h'], DEFAULT_PASSTHROUGH)).toBe(true)
  })
})
