import type {
  ProfileAccount,
  ResolvedConfig,
  ResolvedProfile,
} from '../config/types'
import type { SWITCH_KIND } from '../constants'

// The account a session runs on, as the hook exported it to claude:
// CCPROFILE and CCPROFILE_ACCOUNT (empty is the first account).
export type RunningAccount = {
  config: ResolvedConfig
  profile: ResolvedProfile
  account: ProfileAccount
}

// Why the running account cannot be read; a text without the `ccprofile:`
// prefix.
export type RunningAccountError = { error: string }

// Where `switch` would continue the session.
export type SwitchPlan =
  | { kind: typeof SWITCH_KIND.target; target: ProfileAccount }
  | { kind: typeof SWITCH_KIND.noOther }
  | { kind: typeof SWITCH_KIND.allFull; threshold: number; freeAt: number }

// The handoff file of the mod, format 1: the session to resume and the
// account to resume it on.
export type Handoff = { profile: string; account: string; sessionId: string }

// Why a handoff is not followed; `sessionId` when it is a valid one, so the
// user can resume by hand.
export type HandoffRejection = { reason: string; sessionId?: string }
