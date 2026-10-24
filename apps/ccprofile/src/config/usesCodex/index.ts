import type { ResolvedConfig } from '../types'

// Whether any profile or account has a `codex` entry. Without one, status,
// list and doctor stay silent about codex.
const usesCodex = ({ profiles }: ResolvedConfig): boolean =>
  profiles.some(
    profile =>
      profile.codexHome !== undefined ||
      profile.accounts.some(account => account.codexHome !== undefined)
  )

export default usesCodex
