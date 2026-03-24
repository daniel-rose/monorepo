import fetchEnvCache from '../fetchEnvCache'

const resetFetchEnvCache = (): void => {
  fetchEnvCache.promise = null
  fetchEnvCache.endpoint = null
}

export default resetFetchEnvCache
