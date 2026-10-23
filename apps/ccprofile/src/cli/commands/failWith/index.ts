import type { ExitCode } from '../../../constants'
import { EXIT_CODE } from '../../../constants'
import type { Context } from '../../../context/types'

// Writes each message as one stderr line and reports failure.
const failWith = (ctx: Context, messages: readonly string[]): ExitCode => {
  for (const message of messages) ctx.stderr.write(`${message}\n`)
  return EXIT_CODE.failure
}

export default failWith
