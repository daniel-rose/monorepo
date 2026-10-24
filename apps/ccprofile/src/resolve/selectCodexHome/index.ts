import type { ResolvedProfile } from '../../config/types'
import { CODEX_HOME_SOURCE } from '../../constants'
import type { CodexHome } from '../types'

// The CODEX_HOME of an account of the profile: its own `codex.home`, else the
// profile's (an account without one shares the profile's Codex login), else
// ~/.codex. The first account carries the profile name.
const selectCodexHome = (
  profile: ResolvedProfile,
  accountName: string
): CodexHome => {
  const account = profile.accounts.find(({ name }) => name === accountName)
  if (account?.codexHome !== undefined) {
    return { dir: account.codexHome, source: CODEX_HOME_SOURCE.own }
  }
  if (profile.codexHome === undefined) {
    return { dir: undefined, source: CODEX_HOME_SOURCE.default }
  }
  return {
    dir: profile.codexHome,
    source:
      account === undefined ? CODEX_HOME_SOURCE.own : CODEX_HOME_SOURCE.profile,
  }
}

export default selectCodexHome
