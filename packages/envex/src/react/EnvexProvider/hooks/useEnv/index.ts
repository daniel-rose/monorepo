'use client'

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { useContext } from 'react'
import { EnvexProviderIsMissingError } from '../../../../errors.ts'
import type { Env } from '../../../../types.ts'
import { EnvexContext } from '../../contexts'

function useEnv(): Env
function useEnv<
  TSchema extends StandardSchemaV1,
>(): StandardSchemaV1.InferOutput<TSchema>
function useEnv<TSchema extends StandardSchemaV1 | undefined = undefined>():
  Env | StandardSchemaV1.InferOutput<NonNullable<TSchema>> {
  const env = useContext(EnvexContext)

  if (env === undefined) {
    throw new EnvexProviderIsMissingError(
      'The hook useEnv must be used within a EnvexProvider'
    )
  }

  return env
}

export default useEnv
