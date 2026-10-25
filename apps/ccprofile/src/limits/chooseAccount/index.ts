import type { ResolvedProfile } from '../../config/types'
import type { Context } from '../../context/types'
import assessLimits from '../assessLimits'
import pickAccount from '../pickAccount'
import readProfileLimits from '../readProfileLimits'
import type { ChosenAccount } from '../types'

// The account `claude` starts with when none is requested (spec §5): the
// limit files of all accounts, read at once, judged against the threshold.
const chooseAccount = async (
  profile: ResolvedProfile,
  threshold: number,
  ctx: Pick<Context, 'homedir' | 'platform' | 'now'>
): Promise<ChosenAccount> => {
  const limits = await readProfileLimits(profile, ctx)
  const now = ctx.now()
  const { index, selection } = pickAccount(
    limits.map(({ account, reading }) => ({
      name: account.name,
      assessment: assessLimits(reading, threshold, now),
    })),
    threshold
  )
  return { account: limits[index].account, selection }
}

export default chooseAccount
