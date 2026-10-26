import { Writable } from 'node:stream'

type Terminal = { columns?: number; rows?: number; isTTY?: boolean }

// Inquirer pipes into its output and ends it with the prompt. Node never
// ends process.stderr that way, but any other stream would be closed for
// the lines after the prompt. This stream forwards writes, never ends its
// target and reports the target's terminal size for line wrapping.
const forwardOutput = (target: NodeJS.WritableStream): Writable => {
  const terminal = target as NodeJS.WritableStream & Terminal
  const output = new Writable({
    write: (chunk: Buffer | string, _encoding, callback) => {
      target.write(chunk)
      callback()
    },
  })
  return Object.defineProperties(output, {
    columns: { get: () => terminal.columns },
    rows: { get: () => terminal.rows },
    isTTY: { get: () => terminal.isTTY },
  })
}

export default forwardOutput
