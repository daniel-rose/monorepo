import type { Env, EnvFetchStrategy } from '../../../../types.ts'

const nativeFetchStrategy: EnvFetchStrategy = endpoint =>
  fetch(endpoint).then(res => {
    if (!res.ok) {
      throw new Error(
        `[envex] Failed to fetch env from ${endpoint}: ${res.status} ${res.statusText}`
      )
    }

    return res.json() as Promise<Env>
  })

export default nativeFetchStrategy
