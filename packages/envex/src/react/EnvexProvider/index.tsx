'use client'

import { useEffect, useRef, useState } from 'react'
import { EnvexWindowEnvIsMissingError } from '../../errors.ts'
import type { Env } from '../../types.ts'
import { filterPublicEnv } from '../../utils'
import { EnvexContext } from './contexts'
import type { EnvexProviderPropsInterface } from './types.ts'
import { fetchEnv } from './utils'

const EnvexProvider = (props: EnvexProviderPropsInterface) => {
  const { initialEnv, prefix, endpoint, fetchStrategy, children } = props
  const [env, setEnv] = useState<Env>(
    initialEnv ? filterPublicEnv(initialEnv, prefix) : {}
  )

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
        .then((data: Env) => {
          if (!isCancelled) {
            setEnv(data)
          }
        })
        .catch((error: unknown) => {
          if (!isCancelled) {
            console.error('[envex] Failed to fetch env from endpoint:', error)
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

    setEnv(window.ENV)
  }, [endpoint])

  return <EnvexContext.Provider value={env}>{children}</EnvexContext.Provider>
}

export default EnvexProvider
