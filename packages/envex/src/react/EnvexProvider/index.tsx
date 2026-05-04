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
  const [env, setEnv] = useState<Env>(
    initialEnv ? filterPublicEnv(initialEnv, prefix) : {}
  )
  const [error, setError] = useState<Error | null>(null)

  if (error) throw error

  useEffect(() => {
    let isCancelled = false

    if (endpoint) {
      void fetchEnv(endpoint)
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
            }
          }
        })

      return () => {
        isCancelled = true
      }
    }

    if (!window.ENV || typeof window.ENV !== 'object') {
      throw new EnvexWindowEnvIsMissingError(
        'window.ENV is required. Use EnvScript (Next.js), set window.ENV manually via a <script> tag, or use the endpoint prop.'
      )
    }

    const windowEnv = window.ENV

    void Promise.resolve(schema ? validateEnv(schema, windowEnv) : windowEnv)
      .then(result => {
        if (!isCancelled) setEnv(result as Env)
      })
      .catch((err: unknown) => {
        if (!isCancelled && err instanceof Error) {
          setError(err)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [endpoint, schema])

  return <EnvexContext.Provider value={env}>{children}</EnvexContext.Provider>
}

export default EnvexProvider
