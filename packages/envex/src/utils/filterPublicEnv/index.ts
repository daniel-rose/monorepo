import { PUBLIC_ENV_PREFIX } from '../../constants.ts'
import type { Env } from '../../types.ts'

const filterPublicEnv = (
  env: Record<string, string | undefined>,
  prefix: string | null = PUBLIC_ENV_PREFIX
): Env =>
  prefix === null
    ? { ...env }
    : Object.fromEntries(
        Object.entries(env).filter(([name]) => name.startsWith(prefix))
      )

export default filterPublicEnv
