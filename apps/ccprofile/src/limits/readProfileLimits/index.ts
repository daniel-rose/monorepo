import { profileAccounts } from '../../config'
import type { ResolvedProfile } from '../../config/types'
import type { Context } from '../../context/types'
import readLimits from '../readLimits'
import type { AccountLimits } from '../types'

// The limit files of every account of a profile, in account order.
const readProfileLimits = (
  profile: ResolvedProfile,
  ctx: Pick<Context, 'homedir' | 'platform'>
): Promise<AccountLimits[]> =>
  Promise.all(
    profileAccounts(profile).map(async account => ({
      account,
      reading: await readLimits(account.configDir, ctx),
    }))
  )

export default readProfileLimits
