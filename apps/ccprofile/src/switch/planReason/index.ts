import { SWITCH_KIND, SWITCH_TEXT } from '../../constants'
import { formatResetTime } from '../../limits'
import type { SwitchPlan } from '../types'

// Why a plan has no target; undefined when it has one.
const planReason = (
  plan: SwitchPlan,
  profile: string,
  now: number
): string | undefined => {
  switch (plan.kind) {
    case SWITCH_KIND.noOther:
      return SWITCH_TEXT.noOther(profile)
    case SWITCH_KIND.allFull:
      return SWITCH_TEXT.allFull(
        plan.threshold,
        formatResetTime(plan.freeAt, now)
      )
    case SWITCH_KIND.target:
      return undefined
  }
}

export default planReason
