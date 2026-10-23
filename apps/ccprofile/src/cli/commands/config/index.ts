import { locateConfig } from '../../../config'
import type { ExitCode } from '../../../constants'
import { EXIT_CODE } from '../../../constants'
import type { Context } from '../../../context/types'

// Prints where the config file is (or would be) read from.
const config = (ctx: Context): Promise<ExitCode> => {
  ctx.stdout.write(`${locateConfig(ctx)}\n`)
  return Promise.resolve(EXIT_CODE.ok)
}

export default config
