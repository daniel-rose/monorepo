import type { SegmentPrefixOptions } from '../types'

const stripTrailingSeparators = (value: string, separator: string): string => {
  let end = value.length
  while (end > 0 && value[end - 1] === separator) end -= 1
  return value.slice(0, end)
}

// True when `prefix` equals `value` or covers it up to a segment boundary.
// A root prefix ("/" or "C:\") strips down to "/" resp. "C:" and still
// matches everything below it, because the separator is re-appended.
const isSegmentPrefix = (
  prefix: string,
  value: string,
  { separator, caseInsensitive }: SegmentPrefixOptions
): boolean => {
  if (prefix === '') return false

  const fold = (text: string) => (caseInsensitive ? text.toLowerCase() : text)
  const head = fold(stripTrailingSeparators(prefix, separator))
  const target = fold(stripTrailingSeparators(value, separator))

  return target === head || target.startsWith(head + separator)
}

export default isSegmentPrefix
