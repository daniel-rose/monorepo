import { stat } from 'node:fs/promises'

import loadConfig from '../../config/loadConfig'
import type { ResolvedConfig, ResolvedProfile } from '../../config/types'
import {
  DEFAULT_PASSTHROUGH,
  ENV_VAR,
  LOAD_STATUS,
  ON_UNKNOWN_PROMPT,
  OUTCOME_KIND,
  RESOLVE_MESSAGE,
  RESOLVE_REASON,
} from '../../constants'
import type { Context } from '../../context/types'
import { selectProfile } from '../../prompt'
import findProfile from '../findProfile'
import isPassthrough from '../isPassthrough'
import type { ResolveOptions, ResolveOutcome } from '../types'

// Empty values count as unset.
const readEnv = (ctx: Context, name: string): string | undefined => {
  const value = ctx.env[name]
  return value === undefined || value === '' ? undefined : value
}

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

type ProfileReason =
  | typeof RESOLVE_REASON.explicitProfile
  | typeof RESOLVE_REASON.match
  | typeof RESOLVE_REASON.onUnknown
  | typeof RESOLVE_REASON.prompt

// Every profile outcome warns once if its configDir does not exist yet.
const useProfile = async (
  profile: ResolvedProfile,
  reason: ProfileReason,
  ctx: Context,
  match?: Extract<ResolveOutcome, { kind: 'profile' }>['match']
): Promise<ResolveOutcome> => {
  if (profile.configDir !== undefined && !(await exists(profile.configDir))) {
    ctx.stderr.write(
      RESOLVE_MESSAGE.creatingProfile(profile.name, profile.configDir)
    )
  }
  return { kind: OUTCOME_KIND.profile, profile, reason, match }
}

const fallback = (
  config: ResolvedConfig,
  ctx: Context,
  options: ResolveOptions
): Promise<ResolveOutcome> | ResolveOutcome => {
  if (config.onUnknown !== ON_UNKNOWN_PROMPT) {
    const profile = config.profiles.find(
      ({ name }) => name === config.onUnknown
    )
    if (profile !== undefined) {
      ctx.stderr.write(RESOLVE_MESSAGE.usingOnUnknown(profile.name))
      return useProfile(profile, RESOLVE_REASON.onUnknown, ctx)
    }
  }
  if (!options.interactive) return { kind: OUTCOME_KIND.noMatch }

  return selectProfile(config.profiles, ctx).then(picked => {
    if (picked === null) {
      return { kind: OUTCOME_KIND.error, messages: [RESOLVE_MESSAGE.aborted] }
    }
    ctx.stderr.write(RESOLVE_MESSAGE.promptHint)
    return useProfile(picked, RESOLVE_REASON.prompt, ctx)
  })
}

// Decision order of spec §3. Prints only informational stderr lines; the
// messages of an `error` outcome are left to the caller.
const resolveProfile = async (
  args: readonly string[],
  ctx: Context,
  options: ResolveOptions
): Promise<ResolveOutcome> => {
  if (readEnv(ctx, ENV_VAR.claudeConfigDir) !== undefined) {
    return {
      kind: OUTCOME_KIND.unchanged,
      reason: RESOLVE_REASON.explicitConfigDir,
    }
  }

  // The config only supplies a custom passthrough list; a missing or broken
  // one falls back to the default so `claude --version` always works.
  const loaded = await loadConfig(ctx)
  const passthrough =
    loaded.status === LOAD_STATUS.ok
      ? loaded.config.passthrough
      : DEFAULT_PASSTHROUGH
  if (isPassthrough(args, passthrough)) {
    return {
      kind: OUTCOME_KIND.unchanged,
      reason: RESOLVE_REASON.passthrough,
    }
  }

  if (loaded.status === LOAD_STATUS.missing) {
    return { kind: OUTCOME_KIND.unchanged, reason: RESOLVE_REASON.noConfig }
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
  const explicit = readEnv(ctx, ENV_VAR.profile)
  if (explicit !== undefined) {
    const profile = config.profiles.find(({ name }) => name === explicit)
    return profile === undefined
      ? {
          kind: OUTCOME_KIND.error,
          messages: [RESOLVE_MESSAGE.unknownProfile(explicit)],
        }
      : useProfile(profile, RESOLVE_REASON.explicitProfile, ctx)
  }

  const match = await findProfile(config, ctx)
  if (match !== null) {
    return useProfile(match.profile, RESOLVE_REASON.match, ctx, match)
  }

  return fallback(config, ctx, options)
}

export default resolveProfile
