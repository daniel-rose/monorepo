import type { ResolvedProfile } from '../../config/types'
import { SELECTION_KIND, SWITCH_KIND } from '../../constants'
import type { Context } from '../../context/types'
import { assessLimits, pickAccount, readProfileLimits } from '../../limits'
import type { SwitchPlan } from '../types'

// The account to continue on (spec §6): the other accounts of the profile in
// config order (the first account included), the first not known to be
// full, as `resolve` picks (§5.3). Only reads.
const planSwitch = async (
  profile: ResolvedProfile,
  current: string,
  threshold: number,
  ctx: Pick<Context, 'homedir' | 'platform' | 'now'>
): Promise<SwitchPlan> => {
  const others = (await readProfileLimits(profile, ctx)).filter(
    ({ account }) => account.name !== current
  )
  if (others.length === 0) return { kind: SWITCH_KIND.noOther }

  const now = ctx.now()
  const { index, selection } = pickAccount(
    others.map(({ account, reading }) => ({
      name: account.name,
      assessment: assessLimits(reading, threshold, now),
    })),
    threshold
  )
  return selection.kind === SELECTION_KIND.allFull
    ? { kind: SWITCH_KIND.allFull, threshold, freeAt: selection.freeAt }
    : { kind: SWITCH_KIND.target, target: others[index].account }
}

export default planSwitch
