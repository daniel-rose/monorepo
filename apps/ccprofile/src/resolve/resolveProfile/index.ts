import loadConfig from '../../config/loadConfig'
import type {
  LoadConfigResult,
  ResolvedConfig,
  ResolvedProfile,
} from '../../config/types'
import type { Tool } from '../../constants'
import {
  CODEX_PASSTHROUGH,
  DEFAULT_PASSTHROUGH,
  ENV_VAR,
  LOAD_STATUS,
  ON_UNKNOWN_PROMPT,
  OUTCOME_KIND,
  RESOLVE_MESSAGE,
  RESOLVE_REASON,
  TOOL,
} from '../../constants'
import type { Context } from '../../context/types'
import { selectProfile } from '../../prompt'
import findProfile from '../findProfile'
import isPassthrough from '../isPassthrough'
import pickProfileAccount from '../pickProfileAccount'
import toolTarget from '../toolTarget'
import type { ResolveOptions, ResolveOutcome } from '../types'

// The dir variable of each tool: set, it wins over everything (spec §3.5).
const OVERRIDE = {
  [TOOL.claude]: {
    env: ENV_VAR.claudeConfigDir,
    reason: RESOLVE_REASON.explicitConfigDir,
  },
  [TOOL.codex]: {
    env: ENV_VAR.codexHome,
    reason: RESOLVE_REASON.explicitCodexHome,
  },
} as const

// claude: the config's list, or the default for a missing or broken config
// (so `claude --version` always works); codex: a fixed list.
const passthroughFor = (
  tool: Tool,
  loaded: LoadConfigResult
): readonly string[] => {
  if (tool === TOOL.codex) return CODEX_PASSTHROUGH
  return loaded.status === LOAD_STATUS.ok
    ? loaded.config.passthrough
    : DEFAULT_PASSTHROUGH
}

// Empty values count as unset.
const readEnv = (ctx: Context, name: string): string | undefined => {
  const value = ctx.env[name]
  return value === undefined || value === '' ? undefined : value
}

type ProfileReason =
  | typeof RESOLVE_REASON.explicitProfile
  | typeof RESOLVE_REASON.match
  | typeof RESOLVE_REASON.onUnknown
  | typeof RESOLVE_REASON.prompt

type UseProfile = (
  profile: ResolvedProfile,
  reason: ProfileReason,
  match?: Extract<ResolveOutcome, { kind: 'profile' }>['match']
) => Promise<ResolveOutcome>

// Every profile outcome picks the account (CCPROFILE_ACCOUNT, the limit
// data, else the first), then adds what the tool needs.
const createUseProfile =
  (ctx: Context, tool: Tool, threshold: number): UseProfile =>
  async (profile, reason, match) => {
    const picked = await pickProfileAccount(profile, ctx, { tool, threshold })
    if (picked === undefined) {
      return {
        kind: OUTCOME_KIND.error,
        messages: [
          RESOLVE_MESSAGE.unknownAccount(
            readEnv(ctx, ENV_VAR.account) ?? '',
            profile.name
          ),
        ],
      }
    }

    const { account, selection } = picked
    return {
      kind: OUTCOME_KIND.profile,
      profile,
      account,
      selection,
      reason,
      match,
      ...(await toolTarget({ tool, profile, account }, ctx)),
    }
  }

const fallback = (
  config: ResolvedConfig,
  ctx: Context,
  options: ResolveOptions,
  useProfile: UseProfile
): Promise<ResolveOutcome> | ResolveOutcome => {
  if (config.onUnknown !== ON_UNKNOWN_PROMPT) {
    const profile = config.profiles.find(
      ({ name }) => name === config.onUnknown
    )
    if (profile !== undefined) {
      ctx.stderr.write(RESOLVE_MESSAGE.usingOnUnknown(profile.name))
      return useProfile(profile, RESOLVE_REASON.onUnknown)
    }
  }
  if (!options.interactive) return { kind: OUTCOME_KIND.noMatch }

  return selectProfile(config.profiles, ctx).then(picked => {
    if (picked === null) {
      return { kind: OUTCOME_KIND.error, messages: [RESOLVE_MESSAGE.aborted] }
    }
    ctx.stderr.write(RESOLVE_MESSAGE.promptHint)
    return useProfile(picked, RESOLVE_REASON.prompt)
  })
}

// Decision order of spec §3. Prints only informational stderr lines; the
// messages of an `error` outcome are left to the caller. Each tool checks
// only its own dir variable: codex inside a claude session (CLAUDE_CONFIG_DIR
// set) still follows the inherited CCPROFILE.
const resolveProfile = async (
  args: readonly string[],
  ctx: Context,
  options: ResolveOptions
): Promise<ResolveOutcome> => {
  const tool = options.tool ?? TOOL.claude
  const override = OVERRIDE[tool]
  if (readEnv(ctx, override.env) !== undefined) {
    return { kind: OUTCOME_KIND.unchanged, reason: override.reason }
  }

  const loaded = await loadConfig(ctx)
  if (isPassthrough(args, passthroughFor(tool, loaded))) {
    return {
      kind: OUTCOME_KIND.unchanged,
      reason: RESOLVE_REASON.passthrough,
    }
  }

  if (loaded.status === LOAD_STATUS.missing) {
    const account = readEnv(ctx, ENV_VAR.account)
    return account === undefined
      ? { kind: OUTCOME_KIND.unchanged, reason: RESOLVE_REASON.noConfig }
      : {
          kind: OUTCOME_KIND.error,
          messages: [RESOLVE_MESSAGE.accountWithoutProfile(account)],
        }
  }
  if (loaded.status === LOAD_STATUS.invalid) {
    return {
      kind: OUTCOME_KIND.error,
      messages: [
        RESOLVE_MESSAGE.invalidConfig(loaded.path),
        ...loaded.issues.map(RESOLVE_MESSAGE.issue),
      ],
    }
  }

  const { config } = loaded
  const useProfile = createUseProfile(ctx, tool, config.accountThreshold)
  const explicit = readEnv(ctx, ENV_VAR.profile)
  if (explicit !== undefined) {
    const profile = config.profiles.find(({ name }) => name === explicit)
    return profile === undefined
      ? {
          kind: OUTCOME_KIND.error,
          messages: [RESOLVE_MESSAGE.unknownProfile(explicit)],
        }
      : useProfile(profile, RESOLVE_REASON.explicitProfile)
  }

  const match = await findProfile(config, ctx)
  if (match !== null) {
    return useProfile(match.profile, RESOLVE_REASON.match, match)
  }

  return fallback(config, ctx, options, useProfile)
}

export default resolveProfile
