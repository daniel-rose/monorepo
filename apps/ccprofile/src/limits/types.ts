import type { ProfileAccount } from '../config/types'
import type { LIMITS_STATUS, SELECTION_KIND } from '../constants'

// One rate-limit window as the mod recorded it; `resetsAt` in milliseconds,
// undefined when absent or not a date.
export type LimitWindow = {
  kind: string
  percentUsed: number
  resetsAt: number | undefined
}

// The limit file of one account. Only `ok` is data; everything else counts
// as no data (the account is not known to be full).
export type LimitsReading =
  | { status: typeof LIMITS_STATUS.ok; seenAt: number; windows: LimitWindow[] }
  | { status: typeof LIMITS_STATUS.missing }
  | { status: typeof LIMITS_STATUS.invalid }
  | { status: typeof LIMITS_STATUS.unsupported; version: number }

// A window at or above the threshold that has not reset yet.
export type FullWindow = {
  kind: string
  percentUsed: number
  resetsAt: number
}

// An account is free again once the last of its full windows has reset.
export type Assessment =
  { isFull: false } | { isFull: true; windows: FullWindow[]; freeAt: number }

// A full account `resolve` passed over.
export type SkippedAccount = {
  name: string
  windows: FullWindow[]
  freeAt: number
}

// The choice by limit data: the first account, a later one because the
// accounts before it are full (`skipped`, in order), or all full.
export type AutoSelection =
  | { kind: typeof SELECTION_KIND.first }
  | {
      kind: typeof SELECTION_KIND.auto
      threshold: number
      skipped: SkippedAccount[]
    }
  | { kind: typeof SELECTION_KIND.allFull; threshold: number; freeAt: number }

// Why `resolve` took its account; `explicit` is CCPROFILE_ACCOUNT.
export type AccountSelection =
  AutoSelection | { kind: typeof SELECTION_KIND.explicit }

// The limit file of one account of a profile.
export type AccountLimits = { account: ProfileAccount; reading: LimitsReading }

// `pickAccount`: the index of the chosen account among the candidates.
export type PickResult = { index: number; selection: AutoSelection }

// `chooseAccount`: the chosen account of the profile and why.
export type ChosenAccount = {
  account: ProfileAccount
  selection: AutoSelection
}
