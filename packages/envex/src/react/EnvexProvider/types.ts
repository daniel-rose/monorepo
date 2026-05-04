import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ReactNode } from 'react'
import type { Env } from '../../types.ts'

export interface EnvexProviderPropsInterface {
  initialEnv?: Env
  prefix?: string | null
  endpoint?: string
  schema?: StandardSchemaV1
  children: ReactNode
}
