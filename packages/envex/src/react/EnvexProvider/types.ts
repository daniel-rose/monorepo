import type { ReactNode } from 'react'
import type { Env, EnvFetchStrategy } from '../../types.ts'

export interface EnvexProviderPropsInterface {
  initialEnv?: Env
  prefix?: string | null
  endpoint?: string
  fetchStrategy?: EnvFetchStrategy
  children: ReactNode
}
