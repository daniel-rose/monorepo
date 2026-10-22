import type { ExitCode } from '../../../constants'
import type { Context } from '../../../context/types'
import { runInit } from '../../../init'

const init = (
  ctx: Context,
  options: { example?: boolean }
): Promise<ExitCode> => runInit(ctx, { example: options.example === true })

export default init
