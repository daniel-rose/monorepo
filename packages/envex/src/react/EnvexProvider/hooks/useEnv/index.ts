'use client'

import { useContext } from 'react'
import { EnvexProviderIsMissingError } from '../../../../errors.ts'
import type { Env } from '../../../../types.ts'
import { EnvexContext } from '../../contexts'

const useEnv = (): Env => {
  const env = useContext(EnvexContext)

  if (env === undefined) {
    throw new EnvexProviderIsMissingError(
      'The hook useEnv must be used within a EnvexProvider'
    )
  }

  return env
}

export default useEnv
