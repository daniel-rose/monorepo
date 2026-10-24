import type { ResolvedProfile } from '../../config/types'
import type { SelectedAccount } from '../types'

// The requested account of the profile, the first one (the profile itself)
// without a request; undefined for an unknown name.
const selectAccount = (
  profile: ResolvedProfile,
  requested: string | undefined
): SelectedAccount | undefined => {
  if (requested === undefined || requested === profile.name) {
    return { name: profile.name, configDir: profile.configDir }
  }
  return profile.accounts.find(({ name }) => name === requested)
}

export default selectAccount
