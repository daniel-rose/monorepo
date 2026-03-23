import type { ReactNode } from 'react'
import type { Env } from '../../types.ts'

export interface EnvexProviderPropsInterface {
  initialEnv?: Env
  prefix?: string | null
  endpoint?: string
  children: ReactNode
}
