import readEnv from '../../../config/readEnv'
import { CHECK_STATUS, DOCTOR_TEXT, ENV_VAR } from '../../../constants'
import type { Check } from '../../types'

const OVERRIDES = [ENV_VAR.claudeConfigDir, ENV_VAR.profile]

// Both variables make the hook skip detection, so the profile the config
// would pick is not the one claude gets in this shell.
const checkEnvOverride: Check = ctx => {
  const set = OVERRIDES.filter(name => readEnv(ctx, name) !== undefined)

  return Promise.resolve(
    set.length === 0
      ? []
      : [{ status: CHECK_STATUS.warn, message: DOCTOR_TEXT.envOverride(set) }]
  )
}

export default checkEnvOverride
