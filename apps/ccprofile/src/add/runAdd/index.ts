import approve from '../../cli/commands/approve'
import failWith from '../../cli/commands/failWith'
import type { ExitCode } from '../../constants'
import {
  ADD_TEXT,
  CODEX_MODE,
  EXIT_CODE,
  RESOLVE_MESSAGE,
} from '../../constants'
import type { Context } from '../../context/types'
import validateConfig from '../../init/validateConfig'
import validateName from '../../init/validateName'
import type { DraftProfile } from '../../profile'
import { renderDiff } from '../../setup'
import applyAdd from '../applyAdd'
import askDraft from '../askDraft'
import insertProfile from '../insertProfile'
import readSnapshot from '../readSnapshot'

type AddOptions = { name?: string; yes?: boolean }

const say = (ctx: Context, line: string): void => {
  ctx.stdout.write(`${line}\n`)
}

// Logging in is left to the user: the new profile may stay unused for now.
const printLoginHints = (ctx: Context, profile: DraftProfile): void => {
  say(ctx, ADD_TEXT.loginClaude(profile.name))
  if (profile.codex.mode === CODEX_MODE.home) {
    say(ctx, ADD_TEXT.loginCodex(profile.name))
  }
}

// `ccprofile add [name] [--yes]`: asks for a new profile and adds it to an
// existing, valid config. Shows the change and asks before anything is
// created or written; `onUnknown` and the other profiles stay as they are.
const runAdd = async (ctx: Context, options: AddOptions): Promise<ExitCode> => {
  if (ctx.stdin.isTTY !== true) return failWith(ctx, [ADD_TEXT.needsTerminal])

  const snapshot = await readSnapshot(ctx)
  if ('errors' in snapshot) return failWith(ctx, snapshot.errors)
  const names = snapshot.config.profiles.map(profile => profile.name)
  if (
    options.name !== undefined &&
    validateName(options.name, names) !== true
  ) {
    return failWith(ctx, [ADD_TEXT.badName(options.name)])
  }

  const draft = await askDraft(snapshot, options.name, ctx)
  if (draft === null) return failWith(ctx, [ADD_TEXT.aborted])

  const next = insertProfile(snapshot, draft)
  const issues = await validateConfig(next.json, ctx)
  if (issues.length > 0) {
    return failWith(ctx, [
      ADD_TEXT.invalidConfig,
      ...issues.map(RESOLVE_MESSAGE.issue),
    ])
  }

  ctx.stderr.write(`${ADD_TEXT.diffHeader(snapshot.path)}\n`)
  ctx.stderr.write(`${renderDiff(snapshot.text, next.text)}\n`)
  const refused = await approve(
    {
      question: ADD_TEXT.applyPrompt,
      declined: ADD_TEXT.declined,
      yes: options.yes,
    },
    ctx
  )
  if (refused !== undefined) return failWith(ctx, [refused])

  const code = await applyAdd(
    snapshot,
    { ...next, newDirs: draft.newDirs },
    ctx
  )
  if (code === EXIT_CODE.ok) printLoginHints(ctx, draft.profile)
  return code
}

export default runAdd
