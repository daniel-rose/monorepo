'use client'

import { useEffect, useRef, useState } from 'react'
import { EnvexWindowEnvIsMissingError } from '../../errors.ts'
import type { Env } from '../../types.ts'
import { filterPublicEnv, validateEnv } from '../../utils'
import { EnvexContext } from './contexts'
import type { EnvexProviderPropsInterface } from './types.ts'
import { fetchEnv } from './utils'

const EnvexProvider = (props: EnvexProviderPropsInterface) => {
  const { initialEnv, prefix, endpoint, fetchStrategy, schema, children } =
    props
  const [env, setEnv] = useState<Env>(
    initialEnv ? filterPublicEnv(initialEnv, prefix) : {}
  )
  const [error, setError] = useState<Error | null>(null)

  if (error) throw error

  // Keep the latest strategy in a ref so the fetch effect can read it without
  // depending on it — an inline `fetchStrategy` prop would otherwise change
  // identity on every render and trigger an endless refetch loop.
  const fetchStrategyRef = useRef(fetchStrategy)

  useEffect(() => {
    fetchStrategyRef.current = fetchStrategy
  }, [fetchStrategy])

  useEffect(() => {
    const strategy = fetchStrategyRef.current
    let request: Promise<Env> | null = null

    if (strategy) {
      // Injected strategy owns its own dedup/caching; the module cache is bypassed.
      request = strategy(endpoint ?? '')
    } else if (endpoint) {
      request = fetchEnv(endpoint)
    }

    if (request) {
      let isCancelled = false

      void request
        .then(async (data: Env) => {
          if (isCancelled) return
          const result = schema ? await validateEnv(schema, data) : data
          if (!isCancelled) setEnv(result as Env)
        })
        .catch((err: unknown) => {
          if (!isCancelled) {
            if (err instanceof Error) {
              setError(err)
            } else {
              console.error('[envex] Failed to fetch env from endpoint:', err)
              setError(new Error(String(err)))
            }
          }
        })

      return () => {
        isCancelled = true
      }
    }

    let isCancelled = false

    void Promise.resolve()
      .then(() => {
        if (!window.ENV || typeof window.ENV !== 'object') {
          throw new EnvexWindowEnvIsMissingError(
            'window.ENV is required. Use EnvScript (Next.js), set window.ENV manually via a <script> tag, or use the endpoint prop.'
          )
        }
        return schema ? validateEnv(schema, window.ENV) : window.ENV
      })
      .then(result => {
        if (!isCancelled) setEnv(result as Env)
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          if (err instanceof Error) {
            setError(err)
          } else {
            console.error('[envex] Failed to load env from window.ENV:', err)
            setError(new Error(String(err)))
          }
        }
      })

    return () => {
      isCancelled = true
    }
  }, [endpoint, schema])

  return <EnvexContext.Provider value={env}>{children}</EnvexContext.Provider>
}

export default EnvexProvider
