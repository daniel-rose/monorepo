import { TOOL } from '../../constants'
import formatProfileLine from '../formatProfileLine'
import type { ResolveOutcome } from '../types'

type ProfileOutcome = Extract<ResolveOutcome, { kind: 'profile' }>

// The single stdout line of `resolve --protocol 2`: always exactly four
// fields, `name<TAB>account<TAB>dir<TAB>mcpConfig`, empty ones included.
// `dir` is the CLAUDE_CONFIG_DIR or, with `--tool codex`, the CODEX_HOME;
// codex never gets an mcpConfig.
const formatResolveLine = (outcome: ProfileOutcome): string => {
  const { profile, account } = outcome
  return outcome.tool === TOOL.codex
    ? formatProfileLine({
        profile,
        account,
        dir: outcome.codexHome.dir,
        mcpConfig: undefined,
      })
    : formatProfileLine({
        profile,
        account,
        dir: account.configDir,
        mcpConfig: outcome.mcpConfig,
      })
}

export default formatResolveLine
