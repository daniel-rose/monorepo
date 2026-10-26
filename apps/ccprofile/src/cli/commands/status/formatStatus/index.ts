import { locateConfig } from '../../../../config'
import {
  ENV_VAR,
  OUTCOME_KIND,
  RESOLVE_REASON,
  SELECTION_KIND,
  STATUS_TEXT,
} from '../../../../constants'
import type { Context } from '../../../../context/types'
import { formatSelection } from '../../../../limits'
import type { ResolveOutcome } from '../../../../resolve'

type StatusOutcome = Exclude<ResolveOutcome, { kind: 'error' }>
type ProfileOutcome = Extract<ResolveOutcome, { kind: 'profile' }>

const formatProfile = ({ profile, reason, match }: ProfileOutcome): string => {
  if (reason === RESOLVE_REASON.explicitProfile) {
    return STATUS_TEXT.explicitProfile(profile.name)
  }
  if (reason === RESOLVE_REASON.onlyProfile) {
    return STATUS_TEXT.onlyProfile(profile.name)
  }
  return match === undefined
    ? STATUS_TEXT.onUnknown(profile.name)
    : STATUS_TEXT.matched(profile.name, match.via, match.entry)
}

// Only profiles with accounts name the account, with why when it was not
// simply the first one: CCPROFILE_ACCOUNT or the limit data.
const formatAccount = (
  { profile, account, selection }: ProfileOutcome,
  ctx: Context
): string => {
  if (profile.accounts.length === 0) return ''
  const detail =
    selection.kind === SELECTION_KIND.explicit
      ? ENV_VAR.account
      : formatSelection(selection, ctx.now())
  return STATUS_TEXT.account(account.name, detail)
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
