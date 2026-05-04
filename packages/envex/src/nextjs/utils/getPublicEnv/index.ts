import type { StandardSchemaV1 } from '@standard-schema/spec'
import { getEnv } from '../'
import type { Env } from '../../../types.ts'
import { filterPublicEnv, validateEnv } from '../../../utils'
import type { GetPublicEnvOptions } from './types.ts'

const getPublicEnv = async <
  TSchema extends StandardSchemaV1 | undefined = undefined,
>(
  options?: GetPublicEnvOptions<TSchema>
): Promise<
  TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : Env
> => {
  const env = await getEnv()
  const filtered = filterPublicEnv(env, options?.prefix)

  if (options?.schema) {
    return validateEnv(options.schema, filtered) as never
  }

  return filtered as never
}

export default getPublicEnv
