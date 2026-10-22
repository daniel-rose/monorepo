import { describe, expect, it } from 'vitest'

import matchPath from '../../../src/match/matchPath'

describe('matchPath', () => {
  it('matches the entry itself and anything below it', () => {
    expect(matchPath('/home/jane/work', '/home/jane/work', 'linux')).toBe(true)
    expect(matchPath('/home/jane/work/x', '/home/jane/work', 'linux')).toBe(
      true
    )
  })

  it('does not match a sibling with the same prefix', () => {
    expect(matchPath('/home/jane/workshop', '/home/jane/work', 'linux')).toBe(
      false
    )
  })

  it('handles trailing separators', () => {
    expect(matchPath('/home/jane/work/', '/home/jane/work/', 'linux')).toBe(
      true
    )
  })

  it('matches everything below the root entry', () => {
    expect(matchPath('/anything', '/', 'linux')).toBe(true)
  })

  it('is case-insensitive on darwin only', () => {
    expect(matchPath('/users/jane/work/x', '/Users/Jane/Work', 'darwin')).toBe(
      true
    )
    expect(matchPath('/users/jane/work/x', '/Users/Jane/Work', 'linux')).toBe(
      false
    )
  })

  it('uses backslashes and ignores case on win32', () => {
    expect(
      matchPath(
        'C:\\Users\\jane\\Projects\\x',
        'c:\\users\\jane\\projects',
        'win32'
      )
    ).toBe(true)
    expect(matchPath('C:\\x', 'C:\\', 'win32')).toBe(true)
    expect(matchPath('D:\\x', 'C:\\', 'win32')).toBe(false)
  })
})
