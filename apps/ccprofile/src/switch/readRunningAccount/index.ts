import loadConfig from '../../config/loadConfig'
import readEnv from '../../config/readEnv'
import { ENV_VAR, LOAD_STATUS, SWITCH_TEXT } from '../../constants'
import type { Context } from '../../context/types'
import { selectAccount } from '../../resolve'
import type { RunningAccount, RunningAccountError } from '../types'

// The profile and account of the running session from CCPROFILE and
// CCPROFILE_ACCOUNT, checked against the config.
const readRunningAccount = async (
  ctx: Context
): Promise<RunningAccount | RunningAccountError> => {
  const name = readEnv(ctx, ENV_VAR.profile)
  if (name === undefined) return { error: SWITCH_TEXT.noProfile }

  const loaded = await loadConfig(ctx)
  if (loaded.status !== LOAD_STATUS.ok) {
    return { error: SWITCH_TEXT.unusableConfig(loaded.path) }
  }
  const profile = loaded.config.profiles.find(profile => profile.name === name)
  if (profile === undefined) return { error: SWITCH_TEXT.unknownProfile(name) }

  const requested = readEnv(ctx, ENV_VAR.account)
  const account = selectAccount(profile, requested)
  if (account === undefined) {
    return { error: SWITCH_TEXT.unknownAccount(requested ?? '', name) }
  }
  return { config: loaded.config, profile, account }
}

export default readRunningAccount
