import type { ResolveOutcome } from '../types'

type ProfileOutcome = Extract<ResolveOutcome, { kind: 'profile' }>

// The single stdout line of `resolve --protocol 2`: always exactly four
// fields, `name<TAB>account<TAB>configDir<TAB>mcpConfig`, empty ones included.
const formatResolveLine = ({
  profile,
  account,
  mcpConfig,
}: Pick<ProfileOutcome, 'profile' | 'account' | 'mcpConfig'>): string =>
  `${[profile.name, account.name, account.configDir ?? '', mcpConfig ?? ''].join('\t')}\n`

export default formatResolveLine
