import getEnv from '../getEnv'

const getEnvByName = async (name: string): Promise<string | undefined> => {
  const env = await getEnv()

  return env[name]
}

export default getEnvByName
