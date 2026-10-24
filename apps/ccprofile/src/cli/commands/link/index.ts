import type { ResolvedConfig, ResolvedProfile } from '../../../config'
import { loadConfig } from '../../../config'
import type { ExitCode } from '../../../constants'
import {
  EXIT_CODE,
  LINK_STEP,
  LINK_TEXT,
  LOAD_STATUS,
  RESOLVE_MESSAGE,
  STATUS_TEXT,
} from '../../../constants'
import type { Context } from '../../../context/types'
import type { AccountPlan, ApplyResult } from '../../../link'
import { applyLinks, planLinks } from '../../../link'
import confirm from '../../../prompt/confirm'
import failWith from '../failWith'
import formatPlan from './formatPlan'
import type { LinkOptions } from './types'

const say = (ctx: Context, line: string): void => {
  ctx.stderr.write(`${line}\n`)
}

const hasWork = (plan: AccountPlan): boolean =>
  plan.createAccountDir ||
  plan.createSourceDirs.length > 0 ||
  plan.steps.some(step => step.kind === LINK_STEP.create)

const hasConflict = (plan: AccountPlan): boolean =>
  plan.steps.some(step => step.kind === LINK_STEP.conflict)

const reportFailures = (ctx: Context, { failures }: ApplyResult): void => {
  for (const failure of failures) {
    say(
      ctx,
      failure.unsupported
        ? LINK_TEXT.unsupported(failure.target)
        : LINK_TEXT.failed(failure.target, failure.reason)
    )
  }
}

// The profiles to link: the named one, or all; only those with accounts.
const pickProfiles = (
  config: ResolvedConfig,
  name: string | undefined
): ResolvedProfile[] | string => {
  const named = config.profiles.filter(
    profile => name === undefined || profile.name === name
  )
  if (named.length === 0) return RESOLVE_MESSAGE.unknownProfile(name ?? '')
  return named.filter(profile => profile.accounts.length > 0)
}

// `ccprofile link [profile] [--yes]`: links the shared config of each
// profile into its further accounts (spec §3.4). Only adds links and dirs,
// never deletes or overwrites; conflicts are listed and left alone.
const link = async (
  ctx: Context,
  profileName: string | undefined,
  options: LinkOptions
): Promise<ExitCode> => {
  const loaded = await loadConfig(ctx)
  if (loaded.status === LOAD_STATUS.missing) {
    say(ctx, STATUS_TEXT.noProfiles(loaded.path))
    return EXIT_CODE.ok
  }
  if (loaded.status === LOAD_STATUS.invalid) {
    return failWith(ctx, [
      RESOLVE_MESSAGE.invalidConfig(loaded.path),
      ...loaded.issues.map(RESOLVE_MESSAGE.issue),
    ])
  }

  const profiles = pickProfiles(loaded.config, profileName)
  if (typeof profiles === 'string') return failWith(ctx, [profiles])
  if (profiles.length === 0) {
    say(ctx, LINK_TEXT.noAccounts)
    return EXIT_CODE.ok
  }

  const plans = await planLinks(profiles, ctx)
  for (const plan of plans) formatPlan(plan).forEach(line => say(ctx, line))
  const conflicts = plans.some(hasConflict)
  if (conflicts) say(ctx, LINK_TEXT.conflictHint)

  const pending = plans.filter(hasWork)
  if (pending.length === 0) {
    say(ctx, LINK_TEXT.unchanged)
    return conflicts ? EXIT_CODE.failure : EXIT_CODE.ok
  }
  if (options.yes !== true && !(await confirm(LINK_TEXT.applyPrompt, ctx))) {
    return failWith(ctx, [LINK_TEXT.declined])
  }

  const result = await applyLinks(pending, ctx.platform)
  reportFailures(ctx, result)
  say(ctx, LINK_TEXT.done(result.created))
  return conflicts || result.failures.length > 0
    ? EXIT_CODE.failure
    : EXIT_CODE.ok
}

export default link
