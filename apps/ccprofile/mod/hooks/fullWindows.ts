import type { RateLimit } from './types'

// The windows at or above the threshold that have not reset yet, as
// ccprofile judges them (`assessLimits`); one without `resetsAt` never
// counts.
const fullWindows = (
  rateLimits: readonly RateLimit[],
  threshold: number,
  now: number
): RateLimit[] =>
  rateLimits.filter(
    ({ percentUsed, resetsAt }) =>
      percentUsed >= threshold &&
      resetsAt !== undefined &&
      Date.parse(resetsAt) > now
  )

export default fullWindows
