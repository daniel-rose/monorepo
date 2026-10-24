import readEnv from '../../../config/readEnv'
import { CHECK_STATUS, DOCTOR_TEXT, ENV_VAR } from '../../../constants'
import type { Check } from '../../types'

const OVERRIDES = [ENV_VAR.claudeConfigDir, ENV_VAR.codexHome, ENV_VAR.profile]

// Each variable makes the hooks skip detection (CODEX_HOME only for codex),
// so the profile the config would pick is not the one this shell gets.
const checkEnvOverride: Check = ctx => {
  const set = OVERRIDES.filter(name => readEnv(ctx, name) !== undefined)

  return Promise.resolve(
    set.length === 0
      ? []
      : [{ status: CHECK_STATUS.warn, message: DOCTOR_TEXT.envOverride(set) }]
  )
}

export default checkEnvOverride
