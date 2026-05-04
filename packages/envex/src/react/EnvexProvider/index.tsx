'use client'

import { useEffect, useState } from 'react'
import { EnvexWindowEnvIsMissingError } from '../../errors.ts'
import type { Env } from '../../types.ts'
import { filterPublicEnv, validateEnv } from '../../utils'
import { EnvexContext } from './contexts'
import type { EnvexProviderPropsInterface } from './types.ts'
import { fetchEnv } from './utils'

const EnvexProvider = (props: EnvexProviderPropsInterface) => {
  const { initialEnv, prefix, endpoint, schema, children } = props
  const [rawEnv, setRawEnv] = useState<Env | null>(null)
  const [env, setEnv] = useState<Env>(
    initialEnv && !schema ? filterPublicEnv(initialEnv, prefix) : {}
  )
  const [error, setError] = useState<Error | null>(null)

  if (error) throw error

  // Fetches raw env from endpoint or window.ENV — no schema dependency so
  // the effect doesn't re-run when schema identity changes.
  useEffect(() => {
    let isCancelled = false

    if (endpoint) {
      void fetchEnv(endpoint)
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
