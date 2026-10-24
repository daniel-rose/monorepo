import type { ENTRY_KIND, ENTRY_STATE, LINK_STEP, Tool } from '../constants'

// A file or directory of a source dir that account dirs link to.
export type SharedEntry = {
  name: string
  kind: (typeof ENTRY_KIND)[keyof typeof ENTRY_KIND]
}

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

// An account dir of a tool: the CLAUDE_CONFIG_DIR or the CODEX_HOME.
export type LinkTarget = { account: string; dir: string }

// One tool of a profile: the source dir, the account dirs that link into it
// and the entries they share.
export type LinkGroup = {
  tool: Tool
  profile: string
  source: string
  targets: LinkTarget[]
  entries: SharedEntry[]
}

// Everything `link` would do for one account dir. A plan without steps only
// creates the dir (the Codex home of a profile, codex never creates it).
export type LinkPlan = {
  tool: Tool
  profile: string
  account: string
  dir: string
  createDir: boolean
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
