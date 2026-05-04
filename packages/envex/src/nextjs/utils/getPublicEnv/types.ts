import type { StandardSchemaV1 } from '@standard-schema/spec'

export interface GetPublicEnvOptions<
  TSchema extends StandardSchemaV1 | undefined = undefined,
> {
  schema?: TSchema
  prefix?: string | null
}
