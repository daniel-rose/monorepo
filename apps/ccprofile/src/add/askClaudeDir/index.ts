import { basename } from 'node:path'

import { expandHome } from '../../config'
import pathFlavor from '../../config/pathFlavor'
import { ADD_TEXT, CLAUDE_DIR_CHOICE, CONFIG_FILE } from '../../constants'
import type { Context } from '../../context/types'
import type { Candidate } from '../../init'
import { readAuthStatus } from '../../init'
import formatAuth from '../../init/formatAuth'
import { validateNewDir } from '../../profile'
import type { Choice } from '../../prompt'
import { input, select } from '../../prompt'
import type { ClaudeDirChoice } from '../types'

type AskClaudeDirConfig = {
  name: string
  candidates: readonly Candidate[]
  taken: ReadonlySet<string>
}

// The chosen directory in `~` form (undefined: ~/.claude) and, for a new
// one, its expanded path to create.
type ClaudeDir = { configDir: string | undefined; create: string | undefined }

const toHomeForm = (configDir: string): string =>
  `${CONFIG_FILE.homeMarker}/${basename(configDir)}`

const toChoice = async (
  { configDir }: Candidate,
  ctx: Context
): Promise<Choice<ClaudeDirChoice>> => {
  const auth = formatAuth(await readAuthStatus(configDir, ctx))
  return {
    value: { kind: CLAUDE_DIR_CHOICE.existing, configDir },
    name: ADD_TEXT.existingDir(
      configDir === undefined ? ADD_TEXT.defaultDir : toHomeForm(configDir),
      auth
    ),
  }
}

const NEW_DIR: Choice<ClaudeDirChoice> = {
  value: { kind: CLAUDE_DIR_CHOICE.new },
  name: ADD_TEXT.newDir,
  description: ADD_TEXT.newDirHint,
}

// A free existing directory (with its login) or a new one, suggested as
// ~/.claude-<name>; null when the user aborts.
const askClaudeDir = async (
  { name, candidates, taken }: AskClaudeDirConfig,
  ctx: Context
): Promise<ClaudeDir | null> => {
  const choices = [
    ...(await Promise.all(candidates.map(c => toChoice(c, ctx)))),
    NEW_DIR,
  ]
  const choice = await select(
    { message: ADD_TEXT.claudePrompt(name), choices, default: NEW_DIR.value },
    ctx
  )
  if (choice === null) return null
  if (choice.kind === CLAUDE_DIR_CHOICE.existing) {
    const { configDir } = choice
    return {
      configDir: configDir === undefined ? undefined : toHomeForm(configDir),
      create: undefined,
    }
  }

  const dir = await input(
    {
      message: ADD_TEXT.dirPrompt(name),
      default: `${CONFIG_FILE.homeMarker}/${CONFIG_FILE.claudeDirName}-${name}`,
      validate: value => validateNewDir(value, taken, ctx),
    },
    ctx
  )
  if (dir === null) return null
  const create = pathFlavor(ctx.platform).resolve(expandHome(dir, ctx.homedir))
  return { configDir: dir, create }
}

export default askClaudeDir
