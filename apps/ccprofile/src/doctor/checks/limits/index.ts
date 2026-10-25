import type { ResolvedProfile } from '../../../config'
import { CHECK_STATUS, DOCTOR_TEXT, LIMITS_STATUS } from '../../../constants'
import type { Context } from '../../../context/types'
import type { AccountLimits } from '../../../limits'
import { readProfileLimits } from '../../../limits'
import type { Check, CheckResult } from '../../types'

// A limit file that exists but cannot be used.
const brokenLine = (
  profile: string,
  { account, reading }: AccountLimits
): CheckResult[] => {
  const owner = DOCTOR_TEXT.accountOwner(profile, account.name)
  switch (reading.status) {
    case LIMITS_STATUS.invalid:
      return [
        {
          status: CHECK_STATUS.warn,
          message: DOCTOR_TEXT.limitsInvalid(owner),
        },
      ]
    case LIMITS_STATUS.unsupported:
      return [
        {
          status: CHECK_STATUS.warn,
          message: DOCTOR_TEXT.limitsUnsupported(owner, reading.version),
        },
      ]
    default:
      return []
  }
}

const checkProfile = async (
  profile: ResolvedProfile,
  ctx: Context
): Promise<CheckResult[]> => {
  const limits = await readProfileLimits(profile, ctx)
  if (limits.every(({ reading }) => reading.status === LIMITS_STATUS.missing)) {
    return [
      {
        status: CHECK_STATUS.warn,
        message: DOCTOR_TEXT.noLimitData(profile.name),
      },
    ]
  }

  // A file without windows is no data, as `list` shows it.
  const withData = limits.filter(
    ({ reading }) =>
      reading.status === LIMITS_STATUS.ok && reading.windows.length > 0
  ).length
  return [
    {
      // Only broken, newer or empty files: no account has usable data.
      status: withData > 0 ? CHECK_STATUS.ok : CHECK_STATUS.warn,
      message: DOCTOR_TEXT.limitData(profile.name, withData, limits.length),
    },
    ...limits.flatMap(entry => brokenLine(profile.name, entry)),
  ]
}

// Limit data of the profiles with accounts (spec §5): no file from any
// account usually means the ccprofile mod is not installed; a broken or
// newer file is named per account. Profiles without accounts have nothing
// to choose and are skipped.
const checkLimits: Check = async (ctx, config) => {
  if (config === null) return []
  const lines = await Promise.all(
    config.profiles
      .filter(({ accounts }) => accounts.length > 0)
      .map(profile => checkProfile(profile, ctx))
  )
  return lines.flat()
}

export default checkLimits
