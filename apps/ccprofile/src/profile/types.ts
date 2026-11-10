import type { ProfileCodex } from '../config'

// A profile as a wizard writes it: directories in the form the user typed
// or was offered (`~/…`); `configDir` undefined is the default profile.
export type DraftProfile = {
  name: string
  configDir?: string
  codex: ProfileCodex
  paths: string[]
  remotes: string[]
}

export type CodexMode = ProfileCodex['mode']

// Matchers of a draft profile.
export type DraftMatchers = Pick<DraftProfile, 'paths' | 'remotes'>
