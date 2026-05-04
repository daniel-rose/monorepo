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
  const [rawEnv, setRawEnv] = useState<Env | null>(null)
  const [env, setEnv] = useState<Env>(
    initialEnv && !schema ? filterPublicEnv(initialEnv, prefix) : {}
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

  // Fetches raw env from endpoint, an injected strategy, or window.ENV — no
  // schema dependency so the effect doesn't re-run when schema identity changes.
  useEffect(() => {
    const strategy = fetchStrategyRef.current
    let request: Promise<Env> | null = null

    if (strategy) {
      // Injected strategy owns its own dedup/caching; the module cache is bypassed.
      request = strategy(endpoint ?? '')
    } else if (endpoint) {
      request = fetchEnv(endpoint)
    }

    let isCancelled = false

    if (request) {
      void request
        .then((data: Env) => {
          if (!isCancelled) setRawEnv(data)
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

    void Promise.resolve()
      .then(() => {
        if (!window.ENV || typeof window.ENV !== 'object') {
          throw new EnvexWindowEnvIsMissingError(
            'window.ENV is required. Use EnvScript (Next.js), set window.ENV manually via a <script> tag, or use the endpoint prop.'
          )
        }
        return window.ENV
      })
      .then(data => {
        if (!isCancelled) setRawEnv(data)
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
  }, [endpoint])

  // Validates raw env against schema and publishes the result. Runs whenever
  // the raw data or schema changes, decoupled from the fetch effect above.
  useEffect(() => {
    if (rawEnv === null) return
    let isCancelled = false

    void Promise.resolve(schema ? validateEnv(schema, rawEnv) : rawEnv)
      .then(result => {
        if (!isCancelled)
          setEnv(
            schema ? (result as Env) : filterPublicEnv(result as Env, prefix)
          )
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          if (err instanceof Error) {
            setError(err)
          } else {
            console.error('[envex] Failed to validate env:', err)
            setError(new Error(String(err)))
          }
        }
      })

    return () => {
      isCancelled = true
    }
  }, [rawEnv, schema, prefix])

  return <EnvexContext.Provider value={env}>{children}</EnvexContext.Provider>
}

export default EnvexProvider
