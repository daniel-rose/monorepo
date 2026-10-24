import { TOOL } from '../../constants'
import type { ResolveOutcome } from '../types'

type ProfileOutcome = Extract<ResolveOutcome, { kind: 'profile' }>

// The single stdout line of `resolve --protocol 2`: always exactly four
// fields, `name<TAB>account<TAB>dir<TAB>mcpConfig`, empty ones included.
// `dir` is the CLAUDE_CONFIG_DIR or, with `--tool codex`, the CODEX_HOME;
// codex never gets an mcpConfig.
// The account is empty for the first account: the hook exports it, and an
// inherited first-account name would make a nested `CCPROFILE=<other>
// claude` fail (the default profile sets no CLAUDE_CONFIG_DIR to stop it).
const formatResolveLine = (outcome: ProfileOutcome): string => {
  const { profile, account } = outcome
  const [dir, mcpConfig] =
    outcome.tool === TOOL.codex
      ? [outcome.codexHome.dir, undefined]
      : [account.configDir, outcome.mcpConfig]
  return `${[
    profile.name,
    account.name === profile.name ? '' : account.name,
    dir ?? '',
    mcpConfig ?? '',
  ].join('\t')}\n`
}

export default formatResolveLine
