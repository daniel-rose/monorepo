import { getPublicEnv } from '../'
import type { GetPublicEnvOptions } from '../getPublicEnv/types.ts'

export type GetPublicEnvByNameOptions = Pick<
  GetPublicEnvOptions,
  'scan' | 'connection'
>

const getPublicEnvByName = async (
  name: string,
  options?: GetPublicEnvByNameOptions
): Promise<string | undefined> => {
  const env = await getPublicEnv(options)

  return env[name]
}

export default getPublicEnvByName
