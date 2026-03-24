import type { Env } from '../../../../types.ts'
import fetchEnvCache from '../fetchEnvCache'

const fetchEnv = (endpoint: string): Promise<Env> => {
  if (fetchEnvCache.promise && fetchEnvCache.endpoint === endpoint) {
    return fetchEnvCache.promise
  }

  fetchEnvCache.endpoint = endpoint
  fetchEnvCache.promise = fetch(endpoint)
    .then(res => res.json() as Promise<Env>)
    .catch((error: unknown) => {
      fetchEnvCache.promise = null
      fetchEnvCache.endpoint = null
      throw error
    })

  return fetchEnvCache.promise
}

export default fetchEnv
