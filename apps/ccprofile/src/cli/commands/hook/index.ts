import type { ExitCode } from '../../../constants'
import { CLI_MESSAGE, EXIT_CODE, SHELL } from '../../../constants'
import type { Context } from '../../../context/types'
import { isShell, readHook } from '../../../hook'
import failWith from '../failWith'

// `ccprofile hook <shell>`: prints the hook for that shell to stdout.
const hook = async (ctx: Context, name: string): Promise<ExitCode> => {
  if (!isShell(name)) {
    return failWith(ctx, [CLI_MESSAGE.unknownShell(name, Object.values(SHELL))])
  }
  ctx.stdout.write(await readHook(name))
  return EXIT_CODE.ok
}

export default hook
