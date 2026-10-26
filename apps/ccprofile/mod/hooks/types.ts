import type LIMITS_FILE from './LIMITS_FILE'
import type SWITCH from './SWITCH'

// One window of `session.measure`'s `rateLimits`, as the file keeps it.
export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

// The limit file, format 1.
export type LimitsFile = {
  version: typeof LIMITS_FILE.version
  seenAt: string
  rateLimits: RateLimit[]
}

// The line of `ccprofile switch --json`, format 1: where the running session
// would continue; `target` null with the `reason` when nowhere.
export type Plan = {
  version: typeof SWITCH.planVersion
  profile: string
  account: string
  threshold: number
  target: string | null
  reason?: string
}

// A plan with a target: what `/ccprofile-switch` arms.
export type ArmedPlan = Plan & { target: string }

// What the mod keeps per load: the switch the person armed, the threshold
// ccprofile named (undefined until it answered), and the windows a toast
// offered already (`kind@resetsAt`).
export type SwitchState = {
  armed: ArmedPlan | undefined
  threshold: number | undefined
  offered: Set<string>
}

// The handoff file the hook reads after /exit, format 1.
export type Handoff = {
  version: typeof SWITCH.handoffVersion
  profile: string
  account: string
  sessionId: string
}
