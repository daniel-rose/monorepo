import { getPublicEnv } from '../'
import type { GetPublicEnvByNameOptions } from './types.ts'

const getPublicEnvByName = async (
  name: string,
  options?: GetPublicEnvByNameOptions
): Promise<string | undefined> => {
  const env = await getPublicEnv(options)

  return env[name]
}

export default getPublicEnvByName
