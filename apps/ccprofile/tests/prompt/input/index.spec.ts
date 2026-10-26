import { PassThrough } from 'node:stream'

import { describe, expect, it } from 'vitest'

import input from '../../../src/prompt/input'
import createTestContext from '../../helpers/createTestContext'
import KEY from '../KEY'
import typeKeys from '../typeKeys'

const NO_SPACES = 'no spaces'

const ask = (keys: readonly string[], preset?: string) => {
  const stdin = new PassThrough()
  const ctx = createTestContext({ stdin })
  const result = input(
    {
      message: 'Name',
      default: preset,
      validate: value => !value.includes(' ') || NO_SPACES,
    },
    ctx
  )
  void typeKeys(stdin, keys)
  return { ctx, result }
}

describe('input', () => {
  it('returns the trimmed answer', async () => {
    expect(await ask(['  work', KEY.enter]).result).toBe('work')
  })

  it('takes the default on Enter', async () => {
    expect(await ask([KEY.enter], 'work').result).toBe('work')
  })

  it('shows the validation message and asks again', async () => {
    const { ctx, result } = ask([
      'a b',
      KEY.enter,
      KEY.backspace,
      KEY.backspace,
      KEY.enter,
    ])
    expect(await result).toBe('a')
    expect(ctx.err()).toContain(NO_SPACES)
  })

  it.each([
    { label: 'Ctrl-C', key: KEY.ctrlC },
    { label: 'Ctrl-D', key: KEY.ctrlD },
  ])('returns null on $label', async ({ key }) => {
    expect(await ask([key]).result).toBeNull()
  })
})
