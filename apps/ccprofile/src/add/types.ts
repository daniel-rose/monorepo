import type { ResolvedConfig } from '../config'
import type { CLAUDE_DIR_CHOICE } from '../constants'
import type { DraftProfile } from '../profile'

// A Claude config directory `add` offers: an existing one (`configDir`
// undefined: ~/.claude), or a new one the user names.
export type ClaudeDirChoice =
  | { kind: typeof CLAUDE_DIR_CHOICE.existing; configDir: string | undefined }
  | { kind: typeof CLAUDE_DIR_CHOICE.new }

// What `add` works on: the file as text, its parsed JSON (written back with
// the new profile) and the resolved config (names and directories in use).
export type ConfigSnapshot = {
  path: string
  text: string
  json: Record<string, unknown>
  config: ResolvedConfig
}

// The answers of the wizard: the profile, where it goes in `profiles`, and
// which of its directories are new (to be created before writing).
export type AddDraft = {
  profile: DraftProfile
  index: number
  newDirs: string[]
}
