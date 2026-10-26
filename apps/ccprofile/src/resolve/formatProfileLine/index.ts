import type { ResolvedProfile } from '../../config/types'
import type { SelectedAccount } from '../types'

type ProfileLine = {
  profile: ResolvedProfile
  account: SelectedAccount
  dir: string | undefined
  mcpConfig: string | undefined
}

// A line the hooks read: `name<TAB>account<TAB>dir<TAB>mcpConfig`, then the
// `extra` fields, empty ones included.
// The account is empty for the first account: the hook exports it, and an
// inherited first-account name would make a nested `CCPROFILE=<other>
// claude` fail (the default profile sets no CLAUDE_CONFIG_DIR to stop it).
const formatProfileLine = (
  { profile, account, dir, mcpConfig }: ProfileLine,
  extra: readonly string[] = []
): string =>
  `${[
    profile.name,
    account.name === profile.name ? '' : account.name,
    dir ?? '',
    mcpConfig ?? '',
    ...extra,
  ].join('\t')}\n`

export default formatProfileLine
