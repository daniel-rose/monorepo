import { posix } from 'node:path'

import type { Shell } from '../../constants'
import { ENV_VAR } from '../../constants'
import { isShell } from '../../hook'

// Basename of $SHELL; on Windows there is no reliable value, so no guess.
const detectShell = (ctx: {
  platform: NodeJS.Platform
  env: Readonly<Record<string, string | undefined>>
}): Shell | null => {
  if (ctx.platform === 'win32') return null
  const name = posix.basename(ctx.env[ENV_VAR.shell] ?? '')
  return isShell(name) ? name : null
}

export default detectShell
