import { runAdd } from '../../../add'
import type { ExitCode } from '../../../constants'
import type { Context } from '../../../context/types'

const add = (
  ctx: Context,
  name: string | undefined,
  options: { yes?: boolean }
): Promise<ExitCode> =>
  runAdd(ctx, {
    ...(name !== undefined && { name }),
    yes: options.yes === true,
  })

export default add
