import { describe, expect, it } from 'vitest'

import { MARKER } from '../../../src/constants'
import updateMarkerBlock from '../../../src/setup/updateMarkerBlock'

const BLOCK = [MARKER.start, "source '/h/hook.zsh'", MARKER.end].join('\n')
const OTHER = [MARKER.start, "source '/other/hook.zsh'", MARKER.end].join('\n')

describe('updateMarkerBlock', () => {
  it('appends the block after exactly one blank line', () => {
    expect(updateMarkerBlock('export A=1\n', BLOCK)).toEqual({
      status: 'changed',
      content: `export A=1\n\n${BLOCK}\n`,
    })
  })

  it('collapses trailing blank lines before appending', () => {
    expect(updateMarkerBlock('export A=1\n\n\n', BLOCK)).toEqual({
      status: 'changed',
      content: `export A=1\n\n${BLOCK}\n`,
    })
  })

  it('writes just the block into an empty file', () => {
    expect(updateMarkerBlock('', BLOCK)).toEqual({
      status: 'changed',
      content: `${BLOCK}\n`,
    })
  })

  it('adds the missing final newline before appending', () => {
    expect(updateMarkerBlock('export A=1', BLOCK)).toEqual({
      status: 'changed',
      content: `export A=1\n\n${BLOCK}\n`,
    })
  })

  it('replaces an existing block in place', () => {
    const content = `before\n${OTHER}\nafter\n`
    expect(updateMarkerBlock(content, BLOCK)).toEqual({
      status: 'changed',
      content: `before\n${BLOCK}\nafter\n`,
    })
  })

  it('reports unchanged for an identical block', () => {
    const content = `before\n${BLOCK}\nafter\n`
    expect(updateMarkerBlock(content, BLOCK)).toEqual({
      status: 'unchanged',
      content,
    })
  })

  it('reports malformed for two blocks', () => {
    const result = updateMarkerBlock(`${BLOCK}\n${OTHER}\n`, BLOCK)
    expect(result.status).toBe('malformed')
  })

  it('reports malformed for a start marker without an end', () => {
    const result = updateMarkerBlock(`${MARKER.start}\nstuff\n`, BLOCK)
    expect(result.status).toBe('malformed')
  })

  it('reports malformed for an end marker without a start', () => {
    const result = updateMarkerBlock(`stuff\n${MARKER.end}\n`, BLOCK)
    expect(result.status).toBe('malformed')
  })

  it('reports malformed when the end comes before the start', () => {
    const result = updateMarkerBlock(`${MARKER.end}\n${MARKER.start}\n`, BLOCK)
    expect(result.status).toBe('malformed')
  })

  it('ignores a marker that is not on a line of its own', () => {
    const content = `echo "${MARKER.start}"\n`
    expect(updateMarkerBlock(content, BLOCK).status).toBe('changed')
  })

  it('removes the block and leaves the rest byte-identical', () => {
    expect(updateMarkerBlock(`before\n${BLOCK}\nafter\n`, null)).toEqual({
      status: 'changed',
      content: 'before\nafter\n',
    })
  })

  it('removes a block at the end of a file without a final newline', () => {
    expect(updateMarkerBlock(`before\n${BLOCK}`, null)).toEqual({
      status: 'changed',
      content: 'before\n',
    })
  })

  it('reports unchanged when there is nothing to remove', () => {
    expect(updateMarkerBlock('before\n', null)).toEqual({
      status: 'unchanged',
      content: 'before\n',
    })
  })

  it('keeps CRLF line endings when appending', () => {
    expect(updateMarkerBlock('a\r\nb\r\n', BLOCK)).toEqual({
      status: 'changed',
      content: `a\r\nb\r\n\r\n${BLOCK.replaceAll('\n', '\r\n')}\r\n`,
    })
  })

  it('keeps CRLF line endings when replacing and removing', () => {
    const crlf = (text: string) => text.replaceAll('\n', '\r\n')
    const content = crlf(`a\n${OTHER}\nb\n`)

    expect(updateMarkerBlock(content, BLOCK)).toEqual({
      status: 'changed',
      content: crlf(`a\n${BLOCK}\nb\n`),
    })
    expect(updateMarkerBlock(content, null)).toEqual({
      status: 'changed',
      content: crlf('a\nb\n'),
    })
  })

  it('treats a CRLF block as unchanged', () => {
    const content = `a\r\n${BLOCK.replaceAll('\n', '\r\n')}\r\n`
    expect(updateMarkerBlock(content, BLOCK).status).toBe('unchanged')
  })
})
