const LINE_BREAK = /\r?\n/

const toLines = (text: string): string[] => {
  if (text === '') return []
  const lines = text.split(LINE_BREAK)
  // The newline that ends the last line is not an extra empty line.
  return lines.at(-1) === '' ? lines.slice(0, -1) : lines
}

// `-`/`+` lines for the changed region only (common head and tail dropped).
// Line endings are ignored; an empty string means no difference.
const renderDiff = (before: string, after: string): string => {
  const oldLines = toLines(before)
  const newLines = toLines(after)

  let head = 0
  while (
    head < oldLines.length &&
    head < newLines.length &&
    oldLines[head] === newLines[head]
  ) {
    head += 1
  }

  let tail = 0
  while (
    tail < oldLines.length - head &&
    tail < newLines.length - head &&
    oldLines[oldLines.length - 1 - tail] ===
      newLines[newLines.length - 1 - tail]
  ) {
    tail += 1
  }

  return [
    ...oldLines.slice(head, oldLines.length - tail).map(line => `-${line}`),
    ...newLines.slice(head, newLines.length - tail).map(line => `+${line}`),
  ].join('\n')
}

export default renderDiff
