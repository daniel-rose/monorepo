import { describe, expect, it } from 'vitest'

import expandHome from '../../../src/config/expandHome'

describe('expandHome', () => {
  it.each([
    ['~', '/home/jane', '/home/jane'],
    ['~/Projects', '/home/jane', '/home/jane/Projects'],
    ['~/Projects', '/home/jane/', '/home/jane/Projects'],
    ['~\\Projects', '/home/jane', '/home/jane/Projects'],
    ['~', 'C:\\Users\\jane', 'C:\\Users\\jane'],
    ['~/Projects', 'C:\\Users\\jane', 'C:\\Users\\jane\\Projects'],
    ['~\\a\\b', 'C:\\Users\\jane', 'C:\\Users\\jane\\a\\b'],
  ])('expands %s with home %s to %s', (value, homedir, expected) => {
    expect(expandHome(value, homedir)).toBe(expected)
  })

  it.each([['/abs/~/x'], ['~jane/x'], ['a~'], ['relative'], ['']])(
    'leaves %j unchanged',
    value => {
      expect(expandHome(value, '/home/jane')).toBe(value)
    }
  )
})
