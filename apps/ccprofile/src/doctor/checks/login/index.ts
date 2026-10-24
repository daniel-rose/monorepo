import type { ResolvedConfig } from '../../../config'
import {
  AUTH_STATE,
  AUTH_UNKNOWN_REASON,
  CHECK_STATUS,
  DOCTOR_TEXT,
} from '../../../constants'
import formatAuth from '../../../init/formatAuth'
import readAuthStatus from '../../../init/readAuthStatus'
import type { Check, CheckResult } from '../../types'

type LoginTarget = {
  configDir: string | undefined
  label: (state: string) => string
}

// Every account has its own login: the profile (first account), then the
// further accounts.
const loginTargets = (config: ResolvedConfig): LoginTarget[] =>
  config.profiles.flatMap(profile => [
    {
      configDir: profile.configDir,
      label: (state: string) => DOCTOR_TEXT.login(profile.name, state),
    },
    ...profile.accounts.map(account => ({
      configDir: account.configDir,
      label: (state: string) =>
        DOCTOR_TEXT.accountLogin(profile.name, account.name, state),
    })),
  ])

// One line per account, all asked at once. A missing claude is already the
// PATH check's fail, so it is not repeated per account.
const checkLogin: Check = async (ctx, config) => {
  if (config === null) return []

  const lines = await Promise.all(
    loginTargets(config).map(async (target): Promise<CheckResult | null> => {
      const auth = await readAuthStatus(target.configDir, ctx)
      if (
        auth.state === AUTH_STATE.unknown &&
        auth.reason === AUTH_UNKNOWN_REASON.notFound
      ) {
        return null
      }
      return {
        status:
          auth.state === AUTH_STATE.loggedIn
            ? CHECK_STATUS.ok
            : CHECK_STATUS.warn,
        message: target.label(formatAuth(auth)),
      }
    })
  )

  return lines.filter(line => line !== null)
}

export default checkLogin
