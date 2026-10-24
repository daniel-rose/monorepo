import {
  AUTH_STATE,
  AUTH_TIMEOUT_MS,
  AUTH_UNKNOWN_REASON,
  ENV_VAR,
} from '../../constants'
import type { Context } from '../../context/types'
import type { AuthStatus } from '../../init/types'

const EXIT_LOGGED_IN = 0
const EXIT_LOGGED_OUT = 1

// `codex login status` of one Codex home (`undefined` = ~/.codex, for which
// CODEX_HOME must be absent): exit 0 logged in, 1 logged out (also for a
// missing home, so the caller checks that first), anything else unknown.
const readCodexLogin = async (
  home: string | undefined,
  ctx: Context
): Promise<AuthStatus> => {
  const result = await ctx.runCommand('codex', ['login', 'status'], {
    cwd: ctx.cwd,
    env: { ...ctx.env, [ENV_VAR.codexHome]: home },
    input: 'ignore',
    timeoutMs: AUTH_TIMEOUT_MS,
  })

  if (result.notFound) {
    return { state: AUTH_STATE.unknown, reason: AUTH_UNKNOWN_REASON.notFound }
  }
  if (result.timedOut) {
    return { state: AUTH_STATE.unknown, reason: AUTH_UNKNOWN_REASON.timeout }
  }
  switch (result.exitCode) {
    case EXIT_LOGGED_IN:
      return { state: AUTH_STATE.loggedIn }
    case EXIT_LOGGED_OUT:
      return { state: AUTH_STATE.loggedOut }
    default:
      return {
        state: AUTH_STATE.unknown,
        reason: AUTH_UNKNOWN_REASON.unreadable,
      }
  }
}

export default readCodexLogin
