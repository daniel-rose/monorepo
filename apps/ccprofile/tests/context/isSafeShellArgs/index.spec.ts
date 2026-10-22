import { describe, expect, it } from 'vitest'

import isSafeShellArgs from '../../../src/context/isSafeShellArgs'

describe('isSafeShellArgs', () => {
  it.each([
    [[]],
    [['--version']],
    [['remote', 'get-url', 'origin']],
    [['a=b:c/d.e']],
  ])('accepts %j', args => {
    expect(isSafeShellArgs(args)).toBe(true)
  })

  it.each([[['']], [['a b']], [['a&b']], [['$(x)']], [['a"b']], [['%PATH%']]])(
    'rejects %j',
    args => {
      expect(isSafeShellArgs(args)).toBe(false)
    }
  )
})
