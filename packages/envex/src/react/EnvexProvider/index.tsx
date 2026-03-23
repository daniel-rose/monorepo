'use client'

import { useEffect, useState } from 'react'
import { EnvexWindowEnvIsMissingError } from '../../errors.ts'
import type { Env } from '../../types.ts'
import filterPublicEnv from '../../utils/filterPublicEnv'
import { EnvexContext } from './contexts'
import type { EnvexProviderPropsInterface } from './types.ts'

const EnvexProvider = (props: EnvexProviderPropsInterface) => {
  const { initialEnv, prefix, children } = props
  const [env, setEnv] = useState<Env>(
    initialEnv ? filterPublicEnv(initialEnv, prefix) : {}
  )

  useEffect(() => {
    if (!window.ENV || typeof window.ENV !== 'object') {
      throw new EnvexWindowEnvIsMissingError(
        'window.ENV is required. Use EnvScript (Next.js) or set window.ENV manually via a <script> tag.'
      )
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(window.ENV)
  }, [])

  return <EnvexContext.Provider value={env}>{children}</EnvexContext.Provider>
}

export default EnvexProvider
