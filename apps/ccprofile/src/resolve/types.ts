import type { ResolvedProfile } from '../config/types'
import type { MATCH_VIA, OUTCOME_KIND, RESOLVE_REASON } from '../constants'

export type ProfileMatch = {
  profile: ResolvedProfile
  via: (typeof MATCH_VIA)[keyof typeof MATCH_VIA]
  // The config entry that matched, as written in the resolved config.
  entry: string
}

export type ResolveOptions = { interactive: boolean }

// The account `resolve` starts claude with. The first account carries the
// profile name and configDir (undefined for the default profile).
export type SelectedAccount = {
  name: string
  configDir: string | undefined
}

export type ResolveOutcome =
  | {
      kind: typeof OUTCOME_KIND.unchanged
      reason:
        | typeof RESOLVE_REASON.explicitConfigDir
        | typeof RESOLVE_REASON.passthrough
        | typeof RESOLVE_REASON.noConfig
    }
  | {
      kind: typeof OUTCOME_KIND.profile
      profile: ResolvedProfile
      account: SelectedAccount
      // <shared source>/.mcp.json when it exists.
      mcpConfig: string | undefined
      reason:
        | typeof RESOLVE_REASON.explicitProfile
        | typeof RESOLVE_REASON.match
        | typeof RESOLVE_REASON.onUnknown
        | typeof RESOLVE_REASON.prompt
      match?: ProfileMatch
    }
  | { kind: typeof OUTCOME_KIND.noMatch }
  // Every message starts with `ccprofile: `; the caller prints them.
  | { kind: typeof OUTCOME_KIND.error; messages: string[] }
