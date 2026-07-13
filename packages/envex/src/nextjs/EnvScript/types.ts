import type { ScanConfig } from '../../types.ts'

export interface EnvScriptProps {
  /** Enable credential scanning: `true` for defaults or a config object. Off by default. */
  scan?: ScanConfig
}
