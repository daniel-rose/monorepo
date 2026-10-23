import {
  AUTH_STATE,
  AUTH_TIMEOUT_MS,
  AUTH_UNKNOWN_REASON,
  ENV_VAR,
} from '../../constants'
import type { Context } from '../../context/types'
import type { AuthStatus } from '../types'

const UNREADABLE: AuthStatus = {
  state: AUTH_STATE.unknown,
  reason: AUTH_UNKNOWN_REASON.unreadable,
}

const parse = (stdout: string): AuthStatus => {
  const unreadable = UNREADABLE
  let json: unknown
  try {
    json = JSON.parse(stdout)
  } catch {
    return unreadable
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return unreadable
  }

  const { loggedIn, email, subscriptionType } = json as Record<string, unknown>
  if (typeof loggedIn !== 'boolean') return unreadable
  if (!loggedIn) return { state: AUTH_STATE.loggedOut }

  return {
    state: AUTH_STATE.loggedIn,
    ...(typeof email === 'string' && { email }),
    ...(typeof subscriptionType === 'string' && { subscriptionType }),
  }
}

// Login state of one config directory (`undefined` = the default one, for
// which CLAUDE_CONFIG_DIR must be absent, not empty).
const readAuthStatus = async (
  configDir: string | undefined,
  ctx: Context,
  options: { timeoutMs?: number } = {}
): Promise<AuthStatus> => {
  const result = await ctx.runCommand('claude', ['auth', 'status', '--json'], {
    cwd: ctx.cwd,
    env: { ...ctx.env, [ENV_VAR.claudeConfigDir]: configDir },
    input: 'ignore',
    timeoutMs: options.timeoutMs ?? AUTH_TIMEOUT_MS,
  })

  if (result.notFound) {
    return {
      state: AUTH_STATE.unknown,
      reason: AUTH_UNKNOWN_REASON.notFound,
    }
  }
  if (result.timedOut) {
    return { state: AUTH_STATE.unknown, reason: AUTH_UNKNOWN_REASON.timeout }
  }
  return parse(result.stdout)
}

export default readAuthStatus
