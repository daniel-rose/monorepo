import { getPublicEnv } from '../'
import type { ScanConfig } from '../../../types.ts'

const getPublicEnvByName = async (
  name: string,
  scan?: ScanConfig
): Promise<string | undefined> => {
  const env = await getPublicEnv({ scan })

  return env[name]
}

export default getPublicEnvByName
