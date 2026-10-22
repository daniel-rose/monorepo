import { locateConfig } from '../../../config'
import type { ExitCode } from '../../../constants'
import { CLI_MESSAGE, EXIT_CODE, OUTCOME_KIND } from '../../../constants'
import type { Context } from '../../../context/types'
import { formatResolveLine, resolveProfile } from '../../../resolve'
import failWith from '../failWith'
import parseArgv from './parseArgv'

// `ccprofile resolve [--] <claude args>`: the protocol of spec §3. stdout is
// empty or exactly one profile line; everything else goes to stderr.
const resolve = async (
  ctx: Context,
  args: readonly string[]
): Promise<ExitCode> => {
  const argv = parseArgv(ctx, args)
  if ('error' in argv) return failWith(ctx, [argv.error])

  const outcome = await resolveProfile(argv.args, ctx, {
    interactive: ctx.stdin.isTTY === true,
  })

  switch (outcome.kind) {
    case OUTCOME_KIND.profile:
      ctx.stdout.write(formatResolveLine(outcome.profile))
      return EXIT_CODE.ok
    case OUTCOME_KIND.unchanged:
      return EXIT_CODE.ok
    case OUTCOME_KIND.noMatch:
      return failWith(ctx, [CLI_MESSAGE.noMatch(locateConfig(ctx))])
    case OUTCOME_KIND.error:
      return failWith(ctx, outcome.messages)
  }
}

export default resolve
