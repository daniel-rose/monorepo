import type { Env } from '../../../../types.ts'
import fetchEnvCache from '../fetchEnvCache'
import nativeFetchStrategy from '../nativeFetchStrategy'

const fetchEnv = (endpoint: string): Promise<Env> => {
  if (fetchEnvCache.promise && fetchEnvCache.endpoint === endpoint) {
    return fetchEnvCache.promise
  }

  fetchEnvCache.endpoint = endpoint
  fetchEnvCache.promise = nativeFetchStrategy(endpoint).catch(
    (error: unknown) => {
      fetchEnvCache.promise = null
      fetchEnvCache.endpoint = null
      throw error
    }
  )

  return fetchEnvCache.promise
}

export default fetchEnv
