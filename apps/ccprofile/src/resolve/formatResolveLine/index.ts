import type { ResolveOutcome } from '../types'

type ProfileOutcome = Extract<ResolveOutcome, { kind: 'profile' }>

// The single stdout line of `resolve --protocol 2`: always exactly four
// fields, `name<TAB>account<TAB>configDir<TAB>mcpConfig`, empty ones included.
// The account is empty for the first account: the hook exports it, and an
// inherited first-account name would make a nested `CCPROFILE=<other>
// claude` fail (the default profile sets no CLAUDE_CONFIG_DIR to stop it).
const formatResolveLine = ({
  profile,
  account,
  mcpConfig,
}: Pick<ProfileOutcome, 'profile' | 'account' | 'mcpConfig'>): string =>
  `${[
    profile.name,
    account.name === profile.name ? '' : account.name,
    account.configDir ?? '',
    mcpConfig ?? '',
  ].join('\t')}\n`

export default formatResolveLine
