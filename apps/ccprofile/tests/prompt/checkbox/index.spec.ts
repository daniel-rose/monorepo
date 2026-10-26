import { PassThrough } from 'node:stream'

import { describe, expect, it } from 'vitest'

import checkbox from '../../../src/prompt/checkbox'
import createTestContext from '../../helpers/createTestContext'
import KEY from '../KEY'
import typeKeys from '../typeKeys'

const CHOICES = [
  { value: 'default', name: '~/.claude', checked: true },
  { value: 'work', name: '~/.claude-work' },
]

const ask = (keys: readonly string[], choices = CHOICES) => {
  const stdin = new PassThrough()
  const ctx = createTestContext({ stdin })
  const result = checkbox({ message: 'Directories', choices }, ctx)
  void typeKeys(stdin, keys)
  return { ctx, result }
}

describe('checkbox', () => {
  it('returns the preselected choices on Enter', async () => {
    expect(await ask([KEY.enter]).result).toEqual(['default'])
  })

  it('toggles with the space key', async () => {
    expect(await ask([KEY.down, KEY.space, KEY.enter]).result).toEqual([
      'default',
      'work',
    ])
  })

  it('asks again while nothing is checked', async () => {
    const unchecked = CHOICES.map(choice => ({ ...choice, checked: false }))
    const { result } = ask([KEY.enter, KEY.space, KEY.enter], unchecked)
    expect(await result).toEqual(['default'])
  })

  it.each([
    { label: 'Ctrl-C', key: KEY.ctrlC },
    { label: 'Ctrl-D', key: KEY.ctrlD },
  ])('returns null on $label', async ({ key }) => {
    expect(await ask([key]).result).toBeNull()
  })
})
