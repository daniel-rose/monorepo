import { MARKER, MARKER_UPDATE_STATUS, SETUP_TEXT } from '../../constants'
import type { MarkerUpdate } from '../types'

const CRLF = '\r\n'
const LF = '\n'
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g
const TRAILING_NEWLINES = /(\r?\n)+$/
const LINE_BREAK = /\r?\n/g

// A marker only counts on a line of its own.
const findMarkerLines = (content: string, marker: string): number[] =>
  [
    ...content.matchAll(
      new RegExp(`^${marker.replace(REGEX_SPECIALS, '\\$&')}[ \\t]*\\r?$`, 'gm')
    ),
  ].map(match => match.index)

const lineEnd = (content: string, from: number): number => {
  const newline = content.indexOf(LF, from)
  const end = newline === -1 ? content.length : newline
  return content[end - 1] === '\r' ? end - 1 : end
}

const skipLineBreak = (content: string, at: number): number => {
  if (content.startsWith(CRLF, at)) return at + CRLF.length
  return content.startsWith(LF, at) ? at + LF.length : at
}

const result = (before: string, after: string): MarkerUpdate => ({
  status:
    before === after
      ? MARKER_UPDATE_STATUS.unchanged
      : MARKER_UPDATE_STATUS.changed,
  content: after,
})

const malformed = (reason: string): MarkerUpdate => ({
  status: MARKER_UPDATE_STATUS.malformed,
  reason,
})

const appendBlock = (content: string, block: string | null): MarkerUpdate => {
  if (block === null) return result(content, content)
  const eol = content.includes(CRLF) ? CRLF : LF
  const body = content.replace(TRAILING_NEWLINES, '')
  const text = block.replace(LINE_BREAK, eol)
  return result(
    content,
    body === '' ? `${text}${eol}` : `${body}${eol}${eol}${text}${eol}`
  )
}

// Adds, replaces (`block` given) or removes (`block === null`) the marker
// block in a startup file. Everything outside the block stays byte-identical;
// the file's line ending (CRLF or LF) is kept. `block` uses `\n`.
const updateMarkerBlock = (
  content: string,
  block: string | null
): MarkerUpdate => {
  const starts = findMarkerLines(content, MARKER.start)
  const ends = findMarkerLines(content, MARKER.end)

  if (starts.length > 1 || ends.length > 1) {
    return malformed(SETUP_TEXT.multipleBlocks)
  }
  const [start] = starts
  const [end] = ends
  if (start === undefined || end === undefined) {
    return start === end
      ? appendBlock(content, block)
      : malformed(SETUP_TEXT.unmatchedMarker)
  }
  if (end < start) return malformed(SETUP_TEXT.unmatchedMarker)

  const blockEnd = lineEnd(content, end)
  if (block === null) {
    return result(
      content,
      content.slice(0, start) + content.slice(skipLineBreak(content, blockEnd))
    )
  }
  const eol = content.includes(CRLF) ? CRLF : LF
  return result(
    content,
    content.slice(0, start) +
      block.replace(LINE_BREAK, eol) +
      content.slice(blockEnd)
  )
}

export default updateMarkerBlock
