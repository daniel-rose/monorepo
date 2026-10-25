import LIMITS_FILE from './LIMITS_FILE'
import type { LimitsFile, RateLimit } from './types'

// The file content for one measurement: the windows as delivered, `seenAt`
// as ISO time.
const limitsFile = (
  seenAt: number,
  rateLimits: readonly RateLimit[]
): LimitsFile => ({
  version: LIMITS_FILE.version,
  seenAt: new Date(seenAt).toISOString(),
  rateLimits: rateLimits.map(({ kind, percentUsed, resetsAt }) => ({
    kind,
    percentUsed,
    ...(resetsAt === undefined ? {} : { resetsAt }),
  })),
})

export default limitsFile
