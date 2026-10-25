import type { ProfileAccount, ResolvedProfile } from '../types'

// Every account of a profile in order: the profile itself (the first
// account, configDir undefined for the default profile), then `accounts`.
const profileAccounts = (profile: ResolvedProfile): ProfileAccount[] => [
  { name: profile.name, configDir: profile.configDir },
  ...profile.accounts.map(({ name, configDir }) => ({ name, configDir })),
]

export default profileAccounts
