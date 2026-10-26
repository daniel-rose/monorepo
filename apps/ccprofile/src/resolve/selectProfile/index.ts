import { profileAccounts } from '../../config'
import type { ResolvedProfile } from '../../config/types'
import { PROFILE_PROMPT_TEXT } from '../../constants'
import type { Context } from '../../context/types'
import type { Choice } from '../../prompt'
import { select } from '../../prompt'

const describe = (profile: ResolvedProfile): string => {
  const dir = PROFILE_PROMPT_TEXT.configDir(profile.configDir)
  return profile.accounts.length === 0
    ? dir
    : PROFILE_PROMPT_TEXT.withAccounts(
        dir,
        profileAccounts(profile).map(({ name }) => name)
      )
}

const toChoice = (profile: ResolvedProfile): Choice<ResolvedProfile> => ({
  value: profile,
  name: profile.name,
  description: describe(profile),
})

// The picked profile, or null for Ctrl-C/Ctrl-D.
const selectProfile = (
  profiles: readonly ResolvedProfile[],
  ctx: Context
): Promise<ResolvedProfile | null> =>
  select(
    { message: PROFILE_PROMPT_TEXT.message, choices: profiles.map(toChoice) },
    ctx
  )

export default selectProfile
