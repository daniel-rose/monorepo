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
type ProfileOutcome = Extract<ResolveOutcome, { kind: 'profile' }>

const formatProfile = ({ profile, reason, match }: ProfileOutcome): string => {
  if (reason === RESOLVE_REASON.explicitProfile) {
    return STATUS_TEXT.explicitProfile(profile.name)
  }
  return match === undefined
    ? STATUS_TEXT.onUnknown(profile.name)
    : STATUS_TEXT.matched(profile.name, match.via, match.entry)
}

// Only profiles with accounts name the account; CCPROFILE_ACCOUNT is the
// only way to pick another than the first one (until automatic choice).
const formatAccount = (outcome: ProfileOutcome, ctx: Context): string => {
  if (outcome.profile.accounts.length === 0) return ''
  const explicit = ctx.env[ENV_VAR.account]
  return STATUS_TEXT.account(
    outcome.account.name,
    explicit !== undefined && explicit !== ''
  )
}

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
    case OUTCOME_KIND.profile:
      return `${formatProfile(outcome)}${formatAccount(outcome, ctx)}`
  }
}

export default formatStatus
