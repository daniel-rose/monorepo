import type { ResolvedProfile } from '../config/types'
import type {
  CODEX_HOME_SOURCE,
  MATCH_VIA,
  OUTCOME_KIND,
  RESOLVE_REASON,
  TOOL,
  Tool,
} from '../constants'
import type { AccountSelection } from '../limits'

export type ProfileMatch = {
  profile: ResolvedProfile
  via: (typeof MATCH_VIA)[keyof typeof MATCH_VIA]
  // The config entry that matched, as written in the resolved config.
  entry: string
}

// `tool` defaults to claude.
export type ResolveOptions = { interactive: boolean; tool?: Tool }

// The account `resolve` starts claude with. The first account carries the
// profile name and configDir (undefined for the default profile).
export type SelectedAccount = {
  name: string
  configDir: string | undefined
}

// The account of a resolved profile and why it was taken.
export type PickedAccount = {
  account: SelectedAccount
  selection: AccountSelection
}

// The CODEX_HOME of the selected account; `dir` undefined is ~/.codex.
export type CodexHome =
  | { dir: undefined; source: typeof CODEX_HOME_SOURCE.default }
  | {
      dir: string
      source: typeof CODEX_HOME_SOURCE.own | typeof CODEX_HOME_SOURCE.profile
    }

// What the selected account needs to start its tool.
export type ToolTarget =
  | { tool: typeof TOOL.claude; mcpConfig: string | undefined }
  | { tool: typeof TOOL.codex; codexHome: CodexHome }

type ProfileOutcomeBase = {
  kind: typeof OUTCOME_KIND.profile
  profile: ResolvedProfile
  account: SelectedAccount
  selection: AccountSelection
  reason:
    | typeof RESOLVE_REASON.explicitProfile
    | typeof RESOLVE_REASON.match
    | typeof RESOLVE_REASON.onUnknown
    | typeof RESOLVE_REASON.onlyProfile
    | typeof RESOLVE_REASON.prompt
  match?: ProfileMatch
}

export type ResolveOutcome =
  | {
      kind: typeof OUTCOME_KIND.unchanged
      reason:
        | typeof RESOLVE_REASON.explicitConfigDir
        | typeof RESOLVE_REASON.explicitCodexHome
        | typeof RESOLVE_REASON.passthrough
        | typeof RESOLVE_REASON.noConfig
    }
  // claude: mcpConfig is <shared source>/.mcp.json when it exists.
  | (ProfileOutcomeBase & ToolTarget)
  | { kind: typeof OUTCOME_KIND.noMatch }
  // Every message starts with `ccprofile: `; the caller prints them.
  | { kind: typeof OUTCOME_KIND.error; messages: string[] }
