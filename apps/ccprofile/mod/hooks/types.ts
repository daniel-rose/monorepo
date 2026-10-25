import type LIMITS_FILE from './LIMITS_FILE'

// One window of `session.measure`'s `rateLimits`, as the file keeps it.
export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

// The limit file, format 1.
export type LimitsFile = {
  version: typeof LIMITS_FILE.version
  seenAt: string
  rateLimits: RateLimit[]
}
