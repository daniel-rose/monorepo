import type { ResolvedProfile } from '../../config/types'
import { CODEX_HOME_SOURCE, CODEX_MODE } from '../../constants'
import type { CodexHome } from '../types'

// The CODEX_HOME of an account of the profile: its own `codex.home`, else
// the profile's (an account without one shares the profile's Codex login),
// else ~/.codex. null when the profile disables codex, for every account.
// The first account carries the profile name.
const selectCodexHome = (
  profile: ResolvedProfile,
  accountName: string
): CodexHome | null => {
  const { codex } = profile
  if (codex.mode === CODEX_MODE.disabled) return null

  const account = profile.accounts.find(({ name }) => name === accountName)
  if (account?.codexHome !== undefined) {
    return { dir: account.codexHome, source: CODEX_HOME_SOURCE.own }
  }
  if (codex.mode === CODEX_MODE.default) {
    return { dir: undefined, source: CODEX_HOME_SOURCE.default }
  }
  return {
    dir: codex.home,
    source:
      account === undefined ? CODEX_HOME_SOURCE.own : CODEX_HOME_SOURCE.profile,
  }
}

export default selectCodexHome
