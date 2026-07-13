import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ReactNode } from 'react'
import type { Env, EnvFetchStrategy } from '../../types.ts'

export interface EnvexProviderPropsInterface {
  initialEnv?: Env
  prefix?: string | null
  endpoint?: string
  fetchStrategy?: EnvFetchStrategy
  schema?: StandardSchemaV1
  children: ReactNode
}
