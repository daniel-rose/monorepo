'use client'

import { useEffect, useState } from 'react'
import { EnvexWindowEnvIsMissingError } from '../../errors.ts'
import type { Env } from '../../types.ts'
import { filterPublicEnv } from '../../utils'
import { EnvexContext } from './contexts'
import type { EnvexProviderPropsInterface } from './types.ts'
import { fetchEnv } from './utils'

const EnvexProvider = (props: EnvexProviderPropsInterface) => {
  const { initialEnv, prefix, endpoint, children } = props
  const [env, setEnv] = useState<Env>(
    initialEnv ? filterPublicEnv(initialEnv, prefix) : {}
  )

  useEffect(() => {
    if (endpoint) {
      let isCancelled = false

      void fetchEnv(endpoint)
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(window.ENV)
  }, [endpoint])

  return <EnvexContext.Provider value={env}>{children}</EnvexContext.Provider>
}

export default EnvexProvider
