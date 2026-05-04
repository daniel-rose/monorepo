import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ScanConfig } from '../../../types.ts'

export interface EnvRouteHandlerOptions<
  TSchema extends StandardSchemaV1 | undefined = undefined,
> {
  maxAge?: number
  schema?: TSchema
  /** Enable credential scanning: `true` for defaults or a config object. Off by default. */
  scan?: ScanConfig
}
