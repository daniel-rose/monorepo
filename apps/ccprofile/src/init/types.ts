import type { AUTH_STATE, AUTH_UNKNOWN_REASON } from '../constants'

// `configDir` is undefined for the default profile (~/.claude).
export type Candidate = { configDir: string | undefined; suggestedName: string }

export type AuthUnknownReason =
  (typeof AUTH_UNKNOWN_REASON)[keyof typeof AUTH_UNKNOWN_REASON]

export type AuthStatus =
  | {
      state: typeof AUTH_STATE.loggedIn
      email?: string
      subscriptionType?: string
    }
  | { state: typeof AUTH_STATE.loggedOut }
  | { state: typeof AUTH_STATE.unknown; reason: AuthUnknownReason }

// A profile as the wizard writes it (`~` form of the config directory).
export type DraftProfile = {
  name: string
  configDir?: string
  paths: string[]
  remotes: string[]
}

export type WizardResult = { profiles: DraftProfile[]; onUnknown: string }
