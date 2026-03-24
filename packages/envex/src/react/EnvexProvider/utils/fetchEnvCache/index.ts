import type { Env } from '../../../../types.ts'

interface FetchEnvCache {
  promise: Promise<Env> | null
  endpoint: string | null
}

const fetchEnvCache: FetchEnvCache = {
  promise: null,
  endpoint: null,
}

export default fetchEnvCache
