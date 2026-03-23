import { PUBLIC_ENV_PREFIX } from '../../constants.ts'
import type { Env } from '../../types.ts'

const filterPublicEnv = (
  env: Record<string, string | undefined>,
  prefix: string | null = PUBLIC_ENV_PREFIX
): Env => {
  if (prefix === null) {
    return { ...env }
  }

  const publicEnv: Env = {}

  for (const name of Object.keys(env)) {
    if (!name.startsWith(prefix)) {
      continue
    }

    publicEnv[name] = env[name]
  }

  return publicEnv
}

export default filterPublicEnv
