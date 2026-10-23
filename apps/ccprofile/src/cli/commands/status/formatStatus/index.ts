import { locateConfig } from '../../../../config'
import {
  ENV_VAR,
  OUTCOME_KIND,
  RESOLVE_REASON,
  STATUS_TEXT,
} from '../../../../constants'
import type { Context } from '../../../../context/types'
import type { ResolveOutcome } from '../../../../resolve'

type StatusOutcome = Exclude<ResolveOutcome, { kind: 'error' }>

const formatStatus = (outcome: StatusOutcome, ctx: Context): string => {
  switch (outcome.kind) {
    case OUTCOME_KIND.noMatch:
      return STATUS_TEXT.willPrompt
    case OUTCOME_KIND.unchanged:
      // Status passes no claude arguments, so `passthrough` cannot occur; like
      // `noConfig` it means that no profile applies.
      return outcome.reason === RESOLVE_REASON.explicitConfigDir
        ? STATUS_TEXT.explicitConfigDir(ctx.env[ENV_VAR.claudeConfigDir] ?? '')
        : STATUS_TEXT.noProfiles(locateConfig(ctx))
    case OUTCOME_KIND.profile: {
      const { profile, reason, match } = outcome
      if (reason === RESOLVE_REASON.explicitProfile) {
        return STATUS_TEXT.explicitProfile(profile.name)
      }
      return match === undefined
        ? STATUS_TEXT.onUnknown(profile.name)
        : STATUS_TEXT.matched(profile.name, match.via, match.entry)
    }
  }
}

export default formatStatus
