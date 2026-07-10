import { getEnv } from '../'
import type { Env, ScanConfig } from '../../../types.ts'
import { assertNoCredentialLeak, filterPublicEnv } from '../../../utils'

const getPublicEnv = async (scan?: ScanConfig): Promise<Env> => {
  const publicEnv = filterPublicEnv(await getEnv())

  await assertNoCredentialLeak(publicEnv, scan)

  return publicEnv
}

export default getPublicEnv
