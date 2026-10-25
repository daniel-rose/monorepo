import readEnv from '../../config/readEnv'
import type { ResolvedProfile } from '../../config/types'
import type { Tool } from '../../constants'
import { ENV_VAR, RESOLVE_MESSAGE, SELECTION_KIND, TOOL } from '../../constants'
import type { Context } from '../../context/types'
import { chooseAccount, formatSelection } from '../../limits'
import selectAccount from '../selectAccount'
import type { PickedAccount } from '../types'

type Options = { tool: Tool; threshold: number }

// The account for a resolved profile (spec §3.5, §5): CCPROFILE_ACCOUNT,
// else for claude the limit data, else the first one. Codex never chooses
// by limits (P7); a nested claude (CLAUDECODE) keeps the first account, so
// it cannot jump away from the session it runs in. undefined: unknown
// CCPROFILE_ACCOUNT. Announces every choice the limit data changed.
const pickProfileAccount = async (
  profile: ResolvedProfile,
  ctx: Context,
  { tool, threshold }: Options
): Promise<PickedAccount | undefined> => {
  const requested = readEnv(ctx, ENV_VAR.account)
  const byLimits =
    requested === undefined &&
    tool === TOOL.claude &&
    profile.accounts.length > 0 &&
    readEnv(ctx, ENV_VAR.claudeCode) === undefined
  if (!byLimits) {
    const account = selectAccount(profile, requested)
    const kind =
      requested === undefined ? SELECTION_KIND.first : SELECTION_KIND.explicit
    return account && { account, selection: { kind } }
  }

  const chosen = await chooseAccount(profile, threshold, ctx)
  const detail = formatSelection(chosen.selection, ctx.now())
  if (detail !== undefined) {
    ctx.stderr.write(
      RESOLVE_MESSAGE.accountChoice(profile.name, chosen.account.name, detail)
    )
  }
  return chosen
}

export default pickProfileAccount
