'use client'

import { useContext } from 'react'
import { EnvexProviderIsMissingError } from '../../../../errors'
import { EnvexContext } from '../../contexts'
import type { UseEnv } from './types.ts'

const useEnv: UseEnv = () => {
  const env = useContext(EnvexContext)

  if (env === undefined) {
    throw new EnvexProviderIsMissingError(
      'The hook useEnv must be used within a EnvexProvider'
    )
  }

  return env as never
}

export default useEnv
