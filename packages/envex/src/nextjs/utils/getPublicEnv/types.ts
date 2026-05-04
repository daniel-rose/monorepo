import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ScanConfig } from '../../../types.ts'

export interface GetPublicEnvOptions<
  TSchema extends StandardSchemaV1 | undefined = undefined,
> {
  schema?: TSchema
  prefix?: string | null
  /** Enable credential scanning: `true` for defaults or a config object. Off by default. */
  scan?: ScanConfig
}
