import { SWITCH, SWITCH_KIND, SWITCH_TEXT } from '../../constants'
import planReason from '../planReason'
import type { RunningAccount, SwitchPlan } from '../types'

// The stdout line of `switch`: one JSON object for the mod (`json`), else a
// line for people. `target` is null and `reason` says why when there is none;
// `threshold` lets the mod tell when to offer the switch.
const formatPlan = (
  { config, profile, account }: RunningAccount,
  plan: SwitchPlan,
  { json, now }: { json: boolean; now: number }
): string => {
  const reason = planReason(plan, profile.name, now)
  const target = plan.kind === SWITCH_KIND.target ? plan.target.name : null
  if (json) {
    return `${JSON.stringify({
      version: SWITCH.planVersion,
      profile: profile.name,
      account: account.name,
      threshold: config.accountThreshold,
      target,
      ...(reason === undefined ? {} : { reason }),
    })}\n`
  }
  return `${
    target === null
      ? SWITCH_TEXT.noTarget(profile.name, account.name, reason ?? '')
      : SWITCH_TEXT.target(profile.name, account.name, target)
  }\n`
}

export default formatPlan
