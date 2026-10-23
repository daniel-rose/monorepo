import { PassThrough, Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import createLineReader from '../../../src/prompt/createLineReader'
import createTestContext from '../../helpers/createTestContext'

describe('createLineReader', () => {
  it('reads buffered lines in order', async () => {
    const ctx = createTestContext({ stdin: Readable.from(['a\nb\nc\n']) })
    const reader = createLineReader(ctx)
    expect(await reader.readLine('1? ')).toBe('a')
    expect(await reader.readLine('2? ')).toBe('b')
    expect(await reader.readLine('3? ')).toBe('c')
    expect(await reader.readLine('4? ')).toBeNull()
    reader.close()
    expect(ctx.err()).toBe('1? 2? 3? ')
  })

  it('resolves a pending question with null when the stream ends', async () => {
    const stdin = new PassThrough()
    const reader = createLineReader(createTestContext({ stdin }))
    const pending = reader.readLine('? ')
    stdin.end()
    expect(await pending).toBeNull()
  })

  it('resolves a pending question with null on close()', async () => {
    const stdin = new PassThrough()
    const reader = createLineReader(createTestContext({ stdin }))
    const pending = reader.readLine('? ')
    reader.close()
    expect(await pending).toBeNull()
  })

  it('returns null for a line read after close()', async () => {
    const reader = createLineReader(
      createTestContext({ stdin: Readable.from(['a\n']) })
    )
    reader.close()
    expect(await reader.readLine('? ')).toBeNull()
  })
})
