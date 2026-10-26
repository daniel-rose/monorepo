import { PassThrough } from 'node:stream'

import { describe, expect, it } from 'vitest'

import confirm from '../../../src/prompt/confirm'
import createTestContext from '../../helpers/createTestContext'
import KEY from '../KEY'
import typeKeys from '../typeKeys'

const ask = (keys: readonly string[]) => {
  const stdin = new PassThrough()
  const ctx = createTestContext({ stdin })
  const result = confirm('Create it?', ctx)
  void typeKeys(stdin, keys)
  return { ctx, result }
}

describe('confirm', () => {
  it.each(['y', 'yes', 'Y'])('accepts %j', async answer => {
    expect(await ask([answer, KEY.enter]).result).toBe(true)
  })

  it.each([
    { label: 'Enter', keys: [KEY.enter] },
    { label: 'n', keys: ['n', KEY.enter] },
    { label: 'Ctrl-C', keys: [KEY.ctrlC] },
    { label: 'Ctrl-D', keys: [KEY.ctrlD] },
  ])('declines on $label', async ({ keys }) => {
    expect(await ask(keys).result).toBe(false)
  })

  it('writes the question to stderr', async () => {
    const { ctx, result } = ask([KEY.enter])
    await result
    expect(ctx.err()).toContain('Create it?')
    expect(ctx.out()).toBe('')
  })
})
