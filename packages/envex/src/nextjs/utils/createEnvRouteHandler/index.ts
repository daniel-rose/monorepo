import type { StandardSchemaV1 } from '@standard-schema/spec'
import { NextResponse } from 'next/server'
import { getPublicEnv } from '../'
import type { EnvRouteHandlerOptions } from './types.ts'

const createEnvRouteHandler = <
  TSchema extends StandardSchemaV1 | undefined = undefined,
>(
  options: EnvRouteHandlerOptions<TSchema> = {}
) => {
  const { maxAge, schema } = options

  return async () => {
    const env = await getPublicEnv({ schema })

    const headers: HeadersInit = {}

    if (maxAge !== undefined) {
      headers['Cache-Control'] = `public, max-age=${maxAge}`
    }

    return NextResponse.json(env, { headers })
  }
}

export default createEnvRouteHandler
