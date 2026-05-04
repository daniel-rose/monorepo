import type { StandardSchemaV1 } from '@standard-schema/spec'
import { connection } from 'next/server'
import type { Env } from '../../../types.ts'
import { validateEnv } from '../../../utils'

export interface GetEnvOptions<
  TSchema extends StandardSchemaV1 | undefined = undefined,
> {
  schema?: TSchema
}

const getEnv = async <TSchema extends StandardSchemaV1 | undefined = undefined>(
  options?: GetEnvOptions<TSchema>
): Promise<
  TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : Env
> => {
  await connection()

  if (options?.schema) {
    return validateEnv(options.schema, process.env) as never
  }

  return process.env as never
}

export default getEnv
