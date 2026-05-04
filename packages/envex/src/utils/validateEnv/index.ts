import type { StandardSchemaV1 } from '@standard-schema/spec'
import { EnvexValidationError } from '../../errors.ts'

export const validateEnv = async <TSchema extends StandardSchemaV1>(
  schema: TSchema,
  env: unknown
): Promise<StandardSchemaV1.InferOutput<TSchema>> => {
  let result = schema['~standard'].validate(env)

  if (result instanceof Promise) {
    result = await result
  }

  if (result.issues) {
    throw new EnvexValidationError(result.issues)
  }

  return result.value
}
