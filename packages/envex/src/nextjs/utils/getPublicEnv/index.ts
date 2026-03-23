import { getEnv } from '../'
import type { Env } from '../../../types.ts'
import { filterPublicEnv } from '../../../utils'

const getPublicEnv = async (): Promise<Env> => {
  const env = await getEnv()

  return filterPublicEnv(env)
}

export default getPublicEnv
