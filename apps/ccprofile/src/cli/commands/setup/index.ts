import { rm } from 'node:fs/promises'

import { loadConfig } from '../../../config'
import type { ExitCode } from '../../../constants'
import {
  CLI_MESSAGE,
  CONFIG_FILE,
  EXIT_CODE,
  LOAD_STATUS,
  SETUP_MODE,
  SETUP_TEXT,
  SHELL,
} from '../../../constants'
import type { Context } from '../../../context/types'
import { isShell, readHook } from '../../../hook'
import { runInit } from '../../../init'
import type { FileChange, SetupMode } from '../../../setup'
import {
  buildPlan,
  checkBashProfile,
  detectShell,
  getIntegrationTarget,
  readText,
  renderDiff,
  writeFileAtomic,
} from '../../../setup'
import approve from '../approve'
import failWith from '../failWith'
import type { SetupDeps, SetupOptions } from './types'

const SHELL_NAMES: readonly string[] = Object.values(SHELL)

const say = (ctx: Context, line: string): void => {
  ctx.stderr.write(`${line}\n`)
}

const pickShell = (ctx: Context, name: string | undefined) => {
  if (name !== undefined) return isShell(name) ? name : null
  return detectShell(ctx)
}

const describeChanges = (
  ctx: Context,
  changes: readonly FileChange[]
): void => {
  for (const change of changes) {
    if (change.after === null) {
      say(ctx, SETUP_TEXT.removeLine(change.file))
    } else if (change.showDiff) {
      say(ctx, SETUP_TEXT.diffHeader(change.file))
      say(ctx, renderDiff(change.before ?? '', change.after))
    } else {
      say(ctx, SETUP_TEXT.writeLine(change.file))
    }
  }
}

const applyChanges = async (
  changes: readonly FileChange[],
  mode: SetupMode
): Promise<void> => {
  // The files may have changed while the question was open: write nothing then.
  for (const change of changes) {
    const now = await readText(change.file, { lenient: change.owned })
    if (now !== change.before) {
      throw new Error(SETUP_TEXT.changedMeanwhile(change.file))
    }
  }

  // Install: hook first, so the startup file never sources a missing file.
  // Remove: startup file first, for the same reason.
  const ordered = mode === SETUP_MODE.install ? changes : [...changes].reverse()
  for (const change of ordered) {
    if (change.after === null) {
      await rm(change.file, { force: true })
    } else {
      await writeFileAtomic(
        change.file,
        change.bom
          ? `${CONFIG_FILE.byteOrderMark}${change.after}`
          : change.after
      )
    }
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

// Without a config the hook does nothing, so setup finishes by running init;
// the exit code is then init's (an unfinished init is an unfinished setup).
const finish = async (
  ctx: Context,
  mode: SetupMode,
  deps: SetupDeps
): Promise<ExitCode> => {
  if (mode === SETUP_MODE.remove) return EXIT_CODE.ok
  const config = await loadConfig(ctx)
  if (config.status !== LOAD_STATUS.missing) return EXIT_CODE.ok
  return deps.runInit(ctx, { example: false })
}

// `ccprofile setup [shell] [--yes] [--remove]`: installs the hook file and
// wires it into the shell startup (or removes both again).
const setup = async (
  ctx: Context,
  shellName: string | undefined,
  options: SetupOptions,
  deps: SetupDeps = { runInit }
): Promise<ExitCode> => {
  const mode: SetupMode =
    options.remove === true ? SETUP_MODE.remove : SETUP_MODE.install

  const shell = pickShell(ctx, shellName)
  if (shell === null) {
    if (shellName !== undefined) {
      return failWith(ctx, [CLI_MESSAGE.unknownShell(shellName, SHELL_NAMES)])
    }
    return failWith(ctx, [
      ctx.platform === 'win32'
        ? SETUP_TEXT.shellRequiredOnWindows(SHELL_NAMES)
        : SETUP_TEXT.shellNotDetected(SHELL_NAMES),
    ])
  }

  try {
    const target = await getIntegrationTarget(shell, ctx)
    const plan = await buildPlan(
      shell,
      target,
      mode,
      await readHook(shell),
      ctx
    )
    if (!plan.ok) return failWith(ctx, [plan.message])
    for (const note of plan.notes) say(ctx, note)

    if (plan.changes.length === 0) {
      say(
        ctx,
        mode === SETUP_MODE.install
          ? SETUP_TEXT.unchanged
          : SETUP_TEXT.unchangedRemove
      )
    } else {
      describeChanges(ctx, plan.changes)
      const refused = await approve(
        {
          question: SETUP_TEXT.applyPrompt,
          declined: SETUP_TEXT.declined,
          yes: options.yes,
        },
        ctx
      )
      if (refused !== undefined) return failWith(ctx, [refused])
      await applyChanges(plan.changes, mode)
      say(ctx, SETUP_TEXT.done(plan.changes.length))
    }

    if (mode === SETUP_MODE.install) {
      if (shell === SHELL.bash) {
        const warning = await checkBashProfile(ctx)
        if (warning !== null) say(ctx, warning)
      }
      say(ctx, SETUP_TEXT.reload)
    }
  } catch (error) {
    return failWith(ctx, [errorMessage(error)])
  }

  return finish(ctx, mode, deps)
}

export default setup
