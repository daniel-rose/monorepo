import type { Env } from '../../../../types'

export interface FetchEnvCache {
  promise: Promise<Env> | null
  endpoint: string | null
}
