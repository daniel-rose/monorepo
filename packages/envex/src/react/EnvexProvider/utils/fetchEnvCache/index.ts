import type { FetchEnvCache } from './types.ts'

const fetchEnvCache: FetchEnvCache = {
  promise: null,
  endpoint: null,
}

export default fetchEnvCache
