import { profileAccounts } from '../../config'
import type { ProfileAccount } from '../../config/types'
import { SWITCH_TEXT } from '../../constants'
import type { Handoff, HandoffRejection, RunningAccount } from '../types'

// The account a handoff resumes on: another account of the profile the
// session ran in.
const checkHandoff = (
  { profile, account, sessionId }: Handoff,
  running: RunningAccount
): ProfileAccount | HandoffRejection => {
  if (profile !== running.profile.name) {
    return {
      reason: SWITCH_TEXT.otherProfile(profile, running.profile.name),
      sessionId,
    }
  }
  const target = profileAccounts(running.profile).find(
    ({ name }) => name === account
  )
  if (target === undefined) {
    return { reason: SWITCH_TEXT.unknownAccount(account, profile), sessionId }
  }
  if (target.name === running.account.name) {
    return { reason: SWITCH_TEXT.sameAccount(target.name), sessionId }
  }
  return target
}

export default checkHandoff
