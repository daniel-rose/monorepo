import SWITCH from './SWITCH'
import type { Plan } from './types'

// Whether `ccprofile switch --json` answered in the format the mod reads.
const isPlan = (value: unknown): value is Plan => {
  if (typeof value !== 'object' || value === null) return false
  const plan = value as Record<string, unknown>
  return (
    plan.version === SWITCH.planVersion &&
    typeof plan.profile === 'string' &&
    typeof plan.account === 'string' &&
    typeof plan.threshold === 'number' &&
    (plan.target === null || typeof plan.target === 'string') &&
    (plan.reason === undefined || typeof plan.reason === 'string')
  )
}

export default isPlan
