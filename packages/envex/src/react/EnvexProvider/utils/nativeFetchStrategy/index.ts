import type { Env, EnvFetchStrategy } from '../../../../types.ts'

const nativeFetchStrategy: EnvFetchStrategy = endpoint =>
  fetch(endpoint).then(res => res.json() as Promise<Env>)

export default nativeFetchStrategy
