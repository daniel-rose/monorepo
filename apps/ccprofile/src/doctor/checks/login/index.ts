import {
  AUTH_STATE,
  AUTH_UNKNOWN_REASON,
  CHECK_STATUS,
  DOCTOR_TEXT,
} from '../../../constants'
import formatAuth from '../../../init/formatAuth'
import readAuthStatus from '../../../init/readAuthStatus'
import type { Check, CheckResult } from '../../types'

// One line per profile, all asked at once. A missing claude is already the
// PATH check's fail, so it is not repeated per profile.
const checkLogin: Check = async (ctx, config) => {
  if (config === null) return []

  const lines = await Promise.all(
    config.profiles.map(async (profile): Promise<CheckResult | null> => {
      const auth = await readAuthStatus(profile.configDir, ctx)
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
        message: DOCTOR_TEXT.login(profile.name, formatAuth(auth)),
      }
    })
  )

  return lines.filter(line => line !== null)
}

export default checkLogin
