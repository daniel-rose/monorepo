import type { z } from 'zod'

import type { LOAD_STATUS } from '../constants'
import type configSchema from './schema'

type CodexEntry = { home: string }

// A further account, resolved. `codexHome` undefined: the account uses the
// Codex home of its profile.
export type Account = {
  name: string
  configDir: string
  codexHome?: string
}

// Raw profile as written in the config file (after defaults).
export type Profile = {
  name: string
  configDir?: string
  codex?: CodexEntry
  paths: string[]
  remotes: string[]
  accounts: { name: string; configDir: string; codex?: CodexEntry }[]
}

// Expanded absolute paths and normalized remotes. `configDir` undefined is
// the default profile (~/.claude); it is also the first account, `accounts`
// holds the further ones. `codexHome` undefined is ~/.codex.
export type ResolvedProfile = {
  name: string
  configDir: string | undefined
  codexHome?: string
  paths: string[]
  remotes: string[]
  accounts: Account[]
}

// One account of a profile in order (`profileAccounts`): the profile itself
// first (configDir undefined for the default profile), then `accounts`.
export type ProfileAccount = { name: string; configDir: string | undefined }

export type ResolvedConfig = {
  onUnknown: string
  passthrough: string[]
  accountThreshold: number
  profiles: ResolvedProfile[]
  schema: string | undefined
}

export type ParsedConfig = z.output<typeof configSchema>

// `config` is only meaningful when `issues` is empty.
export type ResolveConfigResult = {
  issues: string[]
  config: ResolvedConfig
}

export type LoadConfigResult =
  | { status: typeof LOAD_STATUS.missing; path: string }
  | { status: typeof LOAD_STATUS.invalid; path: string; issues: string[] }
  | { status: typeof LOAD_STATUS.ok; path: string; config: ResolvedConfig }
