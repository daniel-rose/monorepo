import { describe, expect, it } from 'vitest'

import renderDiff from '../../../src/setup/renderDiff'

describe('renderDiff', () => {
  it('is empty for identical texts', () => {
    expect(renderDiff('a\nb\n', 'a\nb\n')).toBe('')
  })

  it('shows only the added lines for an append', () => {
    expect(renderDiff('a\nb\n', 'a\nb\n\nblock\n')).toBe('+\n+block')
  })

  it('shows removed and added lines for the changed region only', () => {
    expect(renderDiff('a\nold\nz\n', 'a\nnew\nz\n')).toBe('-old\n+new')
  })

  it('shows removed lines for a deletion', () => {
    expect(renderDiff('a\nblock\nz\n', 'a\nz\n')).toBe('-block')
  })

  it('ignores the line ending style when comparing', () => {
    expect(renderDiff('a\r\nold\r\n', 'a\r\nnew\r\n')).toBe('-old\n+new')
  })

  it('shows a whole new file as additions', () => {
    expect(renderDiff('', 'x\ny\n')).toBe('+x\n+y')
  })
})
