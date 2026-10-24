import type { z } from 'zod'

import type { LOAD_STATUS } from '../constants'
import type configSchema from './schema'

export type Account = {
  name: string
  configDir: string
}

// Raw profile as written in the config file (after defaults).
export type Profile = {
  name: string
  configDir?: string
  paths: string[]
  remotes: string[]
  accounts: Account[]
}

// Expanded absolute paths and normalized remotes. `configDir` undefined is
// the default profile (~/.claude); it is also the first account, `accounts`
// holds the further ones.
export type ResolvedProfile = {
  name: string
  configDir: string | undefined
  paths: string[]
  remotes: string[]
  accounts: Account[]
}

export type ResolvedConfig = {
  onUnknown: string
  passthrough: string[]
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
