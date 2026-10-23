import type { ResolvedConfig } from '../config'
import type { CheckStatus } from '../constants'
import type { Context } from '../context/types'

export type CheckResult = { status: CheckStatus; message: string }

// `config` is null when the config is missing or invalid.
export type Check = (
  ctx: Context,
  config: ResolvedConfig | null
) => Promise<CheckResult[]>
