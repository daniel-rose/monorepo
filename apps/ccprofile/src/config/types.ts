import type { z } from 'zod'

import type { LOAD_STATUS } from '../constants'
import type configSchema from './schema'

// Raw profile as written in the config file (after defaults).
export type Profile = {
  name: string
  configDir?: string
  paths: string[]
  remotes: string[]
}

// Expanded absolute paths and normalized remotes.
export type ResolvedProfile = {
  name: string
  configDir: string | undefined
  paths: string[]
  remotes: string[]
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
