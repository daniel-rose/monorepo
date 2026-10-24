import { locateConfig } from '../../../config'
import type { ExitCode } from '../../../constants'
import {
  CLI_MESSAGE,
  EXIT_CODE,
  OUTCOME_KIND,
  RESOLVE_PROTOCOL,
} from '../../../constants'
import type { Context } from '../../../context/types'
import { formatResolveLine, resolveProfile } from '../../../resolve'
import failWith from '../failWith'
import parseArgv from './parseArgv'
import type { ResolveCommandOptions } from './types'

// `ccprofile resolve --protocol 2 [--] <claude args>`: the protocol of spec
// §3.5. stdout is empty or exactly one profile line; everything else goes to
// stderr. A v1 hook (no --protocol) cannot read the 4-field line, so every
// outcome that would print one, or prompt for one, fails instead.
const resolve = async (
  ctx: Context,
  args: readonly string[],
  { protocol }: ResolveCommandOptions = {}
): Promise<ExitCode> => {
  if (protocol !== undefined && protocol !== RESOLVE_PROTOCOL) {
    return failWith(ctx, [CLI_MESSAGE.unsupportedProtocol(protocol)])
  }
  const current = protocol === RESOLVE_PROTOCOL

  const argv = parseArgv(ctx, args)
  if ('error' in argv) return failWith(ctx, [argv.error])

  const outcome = await resolveProfile(argv.args, ctx, {
    interactive: current && ctx.stdin.isTTY === true,
  })

  switch (outcome.kind) {
    case OUTCOME_KIND.profile:
      if (!current) return failWith(ctx, [CLI_MESSAGE.hookOutdated])
      ctx.stdout.write(formatResolveLine(outcome))
      return EXIT_CODE.ok
    case OUTCOME_KIND.unchanged:
      return EXIT_CODE.ok
    case OUTCOME_KIND.noMatch:
      return failWith(ctx, [
        current
          ? CLI_MESSAGE.noMatch(locateConfig(ctx))
          : CLI_MESSAGE.hookOutdated,
      ])
    case OUTCOME_KIND.error:
      return failWith(ctx, outcome.messages)
  }
}

export default resolve
