import { describe, expect, it } from 'vitest'

import validateMatchers from '../../../src/init/validateMatchers'
import createTestContext from '../../helpers/createTestContext'

const ctx = createTestContext()

describe('validateMatchers', () => {
  it.each([
    'gitlab.example.com',
    'github.com/acme, ~/Projects',
    '/srv/work , gitlab.example.com/group/sub',
  ])('accepts %j', answer => {
    expect(validateMatchers(answer, true, ctx)).toBe(true)
  })

  it.each([
    ['./proj, gitlab.example.com', '"./proj" is not a git remote'],
    ['file:///x', '"file:///x" is not a git remote'],
    ['~other/x', '"~other/x" is not an absolute path'],
  ])('rejects %j', (answer, message) => {
    expect(validateMatchers(answer, true, ctx)).toContain(message)
  })

  it('requires an entry only when asked to', () => {
    expect(validateMatchers(' , ', true, ctx)).toBe(
      'at least one remote or path is required'
    )
    expect(validateMatchers('', false, ctx)).toBe(true)
  })
})
