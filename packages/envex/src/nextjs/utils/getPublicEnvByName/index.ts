import getPublicEnv from '../getPublicEnv'

const getPublicEnvByName = async (
  name: string
): Promise<string | undefined> => {
  const env = await getPublicEnv()

  return env[name]
}

export default getPublicEnvByName
