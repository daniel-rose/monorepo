import type { ExitCode } from '../../../constants'
import { EXIT_CODE, OUTCOME_KIND } from '../../../constants'
import createSilentContext from '../../../context/createSilentContext'
import type { Context } from '../../../context/types'
import { resolveProfile } from '../../../resolve'
import failWith from '../failWith'
import formatStatus from './formatStatus'

// Which profile `claude` would get here and why. Never prompts or reads stdin.
const status = async (ctx: Context): Promise<ExitCode> => {
  const outcome = await resolveProfile([], createSilentContext(ctx), {
    interactive: false,
  })
  if (outcome.kind === OUTCOME_KIND.error)
    return failWith(ctx, outcome.messages)

  ctx.stdout.write(`${formatStatus(outcome, ctx)}\n`)
  return EXIT_CODE.ok
}

export default status
