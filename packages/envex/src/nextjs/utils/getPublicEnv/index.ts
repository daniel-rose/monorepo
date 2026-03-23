import type { Env } from '../../../types.ts'
import filterPublicEnv from '../../../utils/filterPublicEnv'
import getEnv from '../getEnv'

const getPublicEnv = async (): Promise<Env> => {
  const env = await getEnv()

  return filterPublicEnv(env)
}

export default getPublicEnv
