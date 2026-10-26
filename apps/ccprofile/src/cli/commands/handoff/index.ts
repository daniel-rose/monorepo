import type { ExitCode } from '../../../constants'
import {
  CLI_MESSAGE,
  EXIT_CODE,
  RESOLVE_PROTOCOL,
  SWITCH,
  SWITCH_TEXT,
  TOOL,
} from '../../../constants'
import type { Context } from '../../../context/types'
import { formatProfileLine, toolTarget } from '../../../resolve'
import type { HandoffRejection } from '../../../switch'
import { checkHandoff, readRunningAccount, takeHandoff } from '../../../switch'
import failWith from '../failWith'
import type { HandoffOptions } from './types'

// The session already ended normally: a handoff that cannot be followed is
// a warning, not a failure.
const skip = (
  ctx: Context,
  { reason, sessionId }: HandoffRejection
): ExitCode => {
  ctx.stderr.write(
    sessionId === undefined
      ? SWITCH_TEXT.skipped(reason)
      : SWITCH_TEXT.skippedWithSession(reason, sessionId)
  )
  return EXIT_CODE.ok
}

// `ccprofile handoff --protocol 2 --file <path>` (spec §6, used by the hook
// v4 after claude exits): takes the handoff the mod left and prints the line
// to resume on, `name<TAB>account<TAB>dir<TAB>mcpConfig<TAB>sessionId`, for
// the account the session ran on (CCPROFILE, CCPROFILE_ACCOUNT of the
// finished claude). Empty stdout: nothing to resume.
const handoff = async (
  ctx: Context,
  { protocol, file }: HandoffOptions
): Promise<ExitCode> => {
  if (protocol !== RESOLVE_PROTOCOL) {
    return failWith(ctx, [CLI_MESSAGE.unsupportedProtocol(protocol ?? '')])
  }

  const taken = await takeHandoff(file)
  if ('reason' in taken) return skip(ctx, taken)
  const running = await readRunningAccount(ctx)
  if ('error' in running) {
    return skip(ctx, { reason: running.error, sessionId: taken.sessionId })
  }
  const account = checkHandoff(taken, running)
  if ('reason' in account) return skip(ctx, account)

  const { profile } = running
  const target = await toolTarget({ tool: TOOL.claude, profile, account }, ctx)
  ctx.stderr.write(
    SWITCH_TEXT.resuming(
      taken.sessionId.slice(0, SWITCH.shortIdLength),
      account.name,
      profile.name
    )
  )
  ctx.stdout.write(
    formatProfileLine(
      {
        profile,
        account,
        dir: account.configDir,
        mcpConfig: target.tool === TOOL.claude ? target.mcpConfig : undefined,
      },
      [taken.sessionId]
    )
  )
  return EXIT_CODE.ok
}

export default handoff
