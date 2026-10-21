import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Env } from '../../../../types.ts'

/** Overloads of `useEnv`: the raw env, or the output of the given schema. */
export interface UseEnv {
  (): Env
  <TSchema extends StandardSchemaV1>(): StandardSchemaV1.InferOutput<TSchema>
}
