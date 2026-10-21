import type { GetPublicEnvOptions } from '../getPublicEnv/types.ts'

export type GetPublicEnvByNameOptions = Pick<
  GetPublicEnvOptions,
  'scan' | 'connection'
>
