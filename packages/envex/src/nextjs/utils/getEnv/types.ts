import type { StandardSchemaV1 } from '@standard-schema/spec'

export interface GetEnvOptions<
  TSchema extends StandardSchemaV1 | undefined = undefined,
> {
  schema?: TSchema
}
