import type { ProfileCodex, ResolvedConfig } from '../../config'
import { expandHome } from '../../config'
import pathFlavor from '../../config/pathFlavor'
import { ADD_TEXT, CODEX_MODE } from '../../constants'
import type { Context } from '../../context/types'
import suggestRemote from '../../init/suggestRemote'
import validateName from '../../init/validateName'
import {
  askCodex,
  askMatchers,
  collectDirKeys,
  validateNewDir,
} from '../../profile'
import { input } from '../../prompt'
import askClaudeDir from '../askClaudeDir'
import askPosition from '../askPosition'
import configuredDirs from '../configuredDirs'
import freeCandidates from '../freeCandidates'
import type { AddDraft, ConfigSnapshot } from '../types'

type Dirs = {
  configDir: string | undefined
  codex: ProfileCodex
  newDirs: string[]
}

const askName = (taken: readonly string[], ctx: Context) =>
  input(
    {
      message: ADD_TEXT.namePrompt,
      validate: value => validateName(value, taken),
    },
    ctx
  )

// Claude directory and codex of the new profile, neither one in use. Codex
// is preset to none while another profile uses ~/.codex.
const askDirs = async (
  config: ResolvedConfig,
  name: string,
  ctx: Context
): Promise<Dirs | null> => {
  const used = configuredDirs(config)
  const taken = await collectDirKeys(used, ctx)
  const candidates = await freeCandidates(config, taken, ctx)
  const claude = await askClaudeDir({ name, candidates, taken }, ctx)
  if (claude === null) return null

  const { configDir } = claude
  const codexTaken = await collectDirKeys(
    configDir === undefined ? used : [...used, configDir],
    ctx
  )
  const onDefault = config.profiles.some(
    profile => profile.codex.mode === CODEX_MODE.default
  )
  const codex = await askCodex(
    {
      name,
      preset: onDefault ? CODEX_MODE.disabled : CODEX_MODE.default,
      validateHome: value => validateNewDir(value, codexTaken, ctx),
    },
    ctx
  )
  if (codex === null) return null

  const codexHome =
    codex.mode === CODEX_MODE.home
      ? [pathFlavor(ctx.platform).resolve(expandHome(codex.home, ctx.homedir))]
      : []
  const claudeDir = claude.create === undefined ? [] : [claude.create]
  return { configDir, codex, newDirs: [...claudeDir, ...codexHome] }
}

// The wizard of `add`: name (unless given), Claude directory, codex,
// matchers, position. Asks only; null when the user aborts.
const askDraft = async (
  { config }: ConfigSnapshot,
  givenName: string | undefined,
  ctx: Context
): Promise<AddDraft | null> => {
  const names = config.profiles.map(profile => profile.name)
  const name = givenName ?? (await askName(names, ctx))
  if (name === null) return null

  const dirs = await askDirs(config, name, ctx)
  if (dirs === null) return null

  const matchers = await askMatchers(
    { name, required: true, suggestion: await suggestRemote(ctx) },
    ctx
  )
  if (matchers === null) return null

  const index = await askPosition(config, ctx)
  if (index === null) return null

  const { configDir, codex, newDirs } = dirs
  return {
    profile: {
      name,
      ...(configDir !== undefined && { configDir }),
      codex,
      ...matchers,
    },
    index,
    newDirs,
  }
}

export default askDraft
