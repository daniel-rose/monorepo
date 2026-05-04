import type { StandardSchemaV1 } from '@standard-schema/spec'

export interface EnvRouteHandlerOptions<
  TSchema extends StandardSchemaV1 | undefined = undefined,
> {
  maxAge?: number
  schema?: TSchema
}
