import { CODEX_MODE } from '../../constants'
import type { ResolvedConfig } from '../types'

// Whether any profile or account has a `codex` entry (`false` included).
// Without one, status, list and doctor stay silent about codex.
const usesCodex = ({ profiles }: ResolvedConfig): boolean =>
  profiles.some(
    profile =>
      profile.codex.mode !== CODEX_MODE.default ||
      profile.accounts.some(account => account.codexHome !== undefined)
  )

export default usesCodex
