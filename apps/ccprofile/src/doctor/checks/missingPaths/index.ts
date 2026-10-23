import { CHECK_STATUS, DOCTOR_TEXT } from '../../../constants'
import fileExists from '../../fileExists'
import type { Check, CheckResult } from '../../types'

const checkMissingPaths: Check = async (_ctx, config) => {
  if (config === null) return []

  const entries = config.profiles.flatMap(profile =>
    profile.paths.map(path => ({ profile: profile.name, path }))
  )
  const exists = await Promise.all(entries.map(({ path }) => fileExists(path)))

  const missing: CheckResult[] = entries
    .filter((_entry, index) => !exists[index])
    .map(({ profile, path }) => ({
      status: CHECK_STATUS.warn,
      message: DOCTOR_TEXT.pathMissing(profile, path),
    }))

  return missing.length > 0
    ? missing
    : [{ status: CHECK_STATUS.ok, message: DOCTOR_TEXT.pathsOk }]
}

export default checkMissingPaths
