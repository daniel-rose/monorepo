import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import confirm from '../../../src/prompt/confirm'
import createTestContext from '../../helpers/createTestContext'

const ask = (input: string[]) => {
  const ctx = createTestContext({ stdin: Readable.from(input) })
  return { ctx, result: confirm('Create it? [y/N] ', ctx) }
}

describe('confirm', () => {
  it.each(['y\n', 'yes\n', 'Y\n', ' YES \n'])('accepts %j', async input => {
    expect(await ask([input]).result).toBe(true)
  })

  it.each(['\n', 'n\n', 'maybe\n'])('rejects %j', async input => {
    expect(await ask([input]).result).toBe(false)
  })

  it('returns false on EOF', async () => {
    expect(await ask([]).result).toBe(false)
  })

  it('writes the question to stderr', async () => {
    const { ctx, result } = ask(['y\n'])
    await result
    expect(ctx.err()).toContain('Create it? [y/N] ')
  })
})
