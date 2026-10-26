import type { ExitCode } from '../../../constants'
import { EXIT_CODE, SWITCH_TEXT } from '../../../constants'
import type { Context } from '../../../context/types'
import { formatPlan, planSwitch, readRunningAccount } from '../../../switch'
import failWith from '../failWith'
import type { SwitchOptions } from './types'

// `ccprofile switch [--json]` (spec §6): which account the running session
// (CCPROFILE, CCPROFILE_ACCOUNT) would continue on. The mod asks with
// --json before it offers or arms a switch. Only reads.
const switchAccount = async (
  ctx: Context,
  { json = false }: SwitchOptions = {}
): Promise<ExitCode> => {
  const running = await readRunningAccount(ctx)
  if ('error' in running) {
    return failWith(ctx, [SWITCH_TEXT.error(running.error)])
  }

  const plan = await planSwitch(
    running.profile,
    running.account.name,
    running.config.accountThreshold,
    ctx
  )
  ctx.stdout.write(formatPlan(running, plan, { json, now: ctx.now() }))
  return EXIT_CODE.ok
}

export default switchAccount
