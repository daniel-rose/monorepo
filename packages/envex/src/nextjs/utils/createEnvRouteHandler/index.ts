import { NextResponse } from 'next/server'
import { getPublicEnv } from '../'
import type { EnvRouteHandlerOptions } from './types.ts'

const createEnvRouteHandler = (options: EnvRouteHandlerOptions = {}) => {
  const { maxAge } = options

  return async () => {
    const env = await getPublicEnv()

    const headers: HeadersInit = {}

    if (maxAge !== undefined) {
      headers['Cache-Control'] = `public, max-age=${maxAge}`
    }

    return NextResponse.json(env, { headers })
  }
}

export default createEnvRouteHandler
