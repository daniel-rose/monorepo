import { CLI_MESSAGE } from '../../../constants'
import type { Context } from '../../../context/types'
import { confirm } from '../../../prompt'

type ApproveConfig = {
  question: string
  declined: string
  yes: boolean | undefined
}

// Whether a command may apply its changes: `--yes`, or a yes in the
// terminal. Without a terminal there is nobody to ask. Returns the message
// to fail with, or undefined to go ahead.
const approve = async (
  { question, declined, yes }: ApproveConfig,
  ctx: Context
): Promise<string | undefined> => {
  if (yes === true) return undefined
  if (ctx.stdin.isTTY !== true) return CLI_MESSAGE.needsYes
  return (await confirm(question, ctx)) ? undefined : declined
}

export default approve
