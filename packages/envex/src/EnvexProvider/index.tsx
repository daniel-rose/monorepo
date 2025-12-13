'use client'

import { useEffect, useState } from 'react'
import EnvexContext from '../EnvexContext'
import { EnvexScriptIsMissingError } from '../errors.ts'
import filterPublicEnv from '../filterPublicEnv'
import type { Env } from '../types.ts'
import type { EnvexProviderPropsInterface } from './types.ts'

const EnvexProvider = (props: EnvexProviderPropsInterface) => {
  const { initialEnv, children } = props
  const [env, setEnv] = useState<Env>(filterPublicEnv(initialEnv))

  useEffect(() => {
    if (!window.ENV || typeof window.ENV !== 'object') {
      throw new EnvexScriptIsMissingError(
        'EnvexScript is required in head of document.'
      )
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(window.ENV)
  }, [])

  return <EnvexContext.Provider value={env}>{children}</EnvexContext.Provider>
}

export default EnvexProvider
