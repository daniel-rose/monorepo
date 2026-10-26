import { PassThrough } from 'node:stream'

import { describe, expect, it } from 'vitest'

import select from '../../../src/prompt/select'
import createTestContext from '../../helpers/createTestContext'
import KEY from '../KEY'
import typeKeys from '../typeKeys'

const CHOICES = [
  { value: 'work', name: 'work', description: '~/.claude (default)' },
  { value: 'private', name: 'private' },
]

// Keys are typed once the prompt listens.
const ask = (keys: readonly string[], preset?: string) => {
  const stdin = new PassThrough()
  const ctx = createTestContext({ stdin })
  const result = select(
    { message: 'Profile', choices: CHOICES, default: preset },
    ctx
  )
  void typeKeys(stdin, keys)
  return { ctx, result }
}

describe('select', () => {
  it('returns the highlighted choice on Enter', async () => {
    expect(await ask([KEY.enter]).result).toBe('work')
  })

  it('moves with the arrow keys', async () => {
    expect(await ask([KEY.down, KEY.enter]).result).toBe('private')
  })

  it('jumps with a number key', async () => {
    expect(await ask(['2', KEY.enter]).result).toBe('private')
  })

  it('starts on the default', async () => {
    expect(await ask([KEY.enter], 'private').result).toBe('private')
  })

  it.each([
    { label: 'Ctrl-C', key: KEY.ctrlC },
    { label: 'Ctrl-D', key: KEY.ctrlD },
  ])('returns null on $label', async ({ key }) => {
    expect(await ask([key]).result).toBeNull()
  })

  it('writes to stderr only and leaves it open', async () => {
    const { ctx, result } = ask([KEY.enter])
    await result
    expect(ctx.err()).toContain('Profile')
    expect(ctx.err()).toContain('~/.claude (default)')
    expect(ctx.out()).toBe('')
    expect(ctx.stderr.write('after\n')).toBe(true)
    expect(ctx.err().endsWith('after\n')).toBe(true)
  })
})
