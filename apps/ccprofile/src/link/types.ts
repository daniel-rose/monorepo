import type { Account } from '../config/types'
import type { ENTRY_STATE, LINK_STEP, SHARED_ENTRY } from '../constants'

export type SharedEntry = (typeof SHARED_ENTRY)[number]

type SourceState = (typeof ENTRY_STATE.source)[keyof typeof ENTRY_STATE.source]

export type EntryInspection = {
  entry: SharedEntry
  // `<shared source>/<name>` and `<account dir>/<name>`.
  source: string
  target: string
  sourceState: SourceState
} & (
  | {
      targetState:
        typeof ENTRY_STATE.target.absent | typeof ENTRY_STATE.target.linked
    }
  // The raw link target as readlink returns it.
  | { targetState: typeof ENTRY_STATE.target.elsewhere; linkedTo: string }
  | { targetState: typeof ENTRY_STATE.target.replaced; isDirectory: boolean }
)

export type LinkStep =
  | {
      kind:
        | typeof LINK_STEP.create
        | typeof LINK_STEP.ok
        | typeof LINK_STEP.noSource
      inspection: EntryInspection
    }
  | {
      kind: typeof LINK_STEP.conflict
      inspection: EntryInspection
      reason: string
    }

// Everything `link` would do for one further account of a profile.
export type AccountPlan = {
  profile: string
  account: Account
  createAccountDir: boolean
  // Missing source directories, created before the links that need them.
  createSourceDirs: string[]
  steps: LinkStep[]
}

export type LinkFailure = {
  target: string
  unsupported: boolean
  reason: string
}

export type ApplyResult = { created: number; failures: LinkFailure[] }
