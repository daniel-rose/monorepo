import {
  CODEX_HOME_SOURCE,
  ENV_VAR,
  OUTCOME_KIND,
  RESOLVE_REASON,
  STATUS_TEXT,
  TOOL,
} from '../../../../constants'
import type { Context } from '../../../../context/types'
import type { ResolveOutcome } from '../../../../resolve'

// The `codex:` line of `status`, or null when codex gets no profile here
// (no match, no config): then the first line already says why.
const formatCodexStatus = (
  outcome: ResolveOutcome,
  ctx: Context
): string | null => {
  if (
    outcome.kind === OUTCOME_KIND.unchanged &&
    outcome.reason === RESOLVE_REASON.explicitCodexHome
  ) {
    return STATUS_TEXT.codexExplicit(ctx.env[ENV_VAR.codexHome] ?? '')
  }
  if (outcome.kind !== OUTCOME_KIND.profile || outcome.tool !== TOOL.codex) {
    return null
  }

  const { codexHome } = outcome
  switch (codexHome.source) {
    case CODEX_HOME_SOURCE.default:
      return STATUS_TEXT.codexDefault
    case CODEX_HOME_SOURCE.profile:
      return STATUS_TEXT.codexFromProfile(codexHome.dir)
    case CODEX_HOME_SOURCE.own:
      return STATUS_TEXT.codex(codexHome.dir)
  }
}

export default formatCodexStatus
