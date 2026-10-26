import { describe, expect, it } from 'vitest'

import validateName from '../../../src/init/validateName'

describe('validateName', () => {
  it.each(['work', 'seat_2', 'a.b-c'])('accepts %j', name => {
    expect(validateName(name, ['private'])).toBe(true)
  })

  it.each([
    ['the reserved name', 'prompt'],
    ['a taken name', 'private'],
    ['an invalid name', 'my work'],
    ['an empty name', ''],
  ])('rejects %s', (_label, name) => {
    expect(validateName(name, ['private'])).toBe(
      `"${name}" is reserved, duplicate or invalid`
    )
  })
})
