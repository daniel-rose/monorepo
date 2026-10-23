import pathFlavor from '../../config/pathFlavor'
import readEnv from '../../config/readEnv'
import type { Shell } from '../../constants'
import {
  ENV_VAR,
  PROFILE_QUERY_TIMEOUT_MS,
  SETUP_FILE,
  SETUP_TEXT,
  SHELL,
  TARGET_KIND,
} from '../../constants'
import type { Context } from '../../context/types'
import ProfileQueryTimeoutError from '../ProfileQueryTimeoutError'
import type { IntegrationTarget } from '../types'

const LINE_BREAK = /\r?\n/

const queryProfile = async (
  shell: typeof SHELL.pwsh | typeof SHELL.powershell,
  ctx: Context
): Promise<string> => {
  const executable = SETUP_FILE.powerShellExecutable[shell]
  const args = SETUP_FILE.powerShellArgs
  // Windows PowerShell 5.1 must not inherit a PowerShell 7 module path from
  // the caller (and starts slowly without any value); pwsh needs no override.
  const options = { timeoutMs: PROFILE_QUERY_TIMEOUT_MS }
  const result =
    shell === SHELL.powershell
      ? await ctx.runCommand(executable, args, {
          ...options,
          env: SETUP_FILE.powerShellEnv,
        })
      : await ctx.runCommand(executable, args, options)

  if (result.timedOut) {
    throw new ProfileQueryTimeoutError(
      SETUP_TEXT.profileQueryTimedOut(executable)
    )
  }
  if (result.exitCode !== 0) {
    throw new Error(SETUP_TEXT.profileQueryFailed(executable))
  }
  // trim() also drops a UTF-8 byte order mark. Anything but one absolute path
  // (extra output from a noisy profile, a relative path) is not trusted.
  const lines = result.stdout
    .split(LINE_BREAK)
    .map(line => line.trim())
    .filter(line => line !== '')
  const [file] = lines
  if (file === undefined) {
    throw new Error(SETUP_TEXT.profileQueryFailed(executable))
  }
  if (lines.length !== 1 || !pathFlavor(ctx.platform).isAbsolute(file)) {
    throw new Error(SETUP_TEXT.profileQueryInvalid(executable, result.stdout))
  }
  return file
}

// Where the shell integration lives (spec §9). Throws if the PowerShell
// profile path cannot be determined.
const getIntegrationTarget = async (
  shell: Shell,
  ctx: Context
): Promise<IntegrationTarget> => {
  const flavor = pathFlavor(ctx.platform)

  switch (shell) {
    case SHELL.zsh:
      return {
        kind: TARGET_KIND.block,
        file: flavor.join(
          readEnv(ctx, ENV_VAR.zdotdir) ?? ctx.homedir,
          SETUP_FILE.zshrc
        ),
      }
    case SHELL.bash:
      return {
        kind: TARGET_KIND.block,
        file: flavor.join(ctx.homedir, SETUP_FILE.bashrc),
      }
    case SHELL.fish:
      return {
        kind: TARGET_KIND.file,
        file: flavor.join(ctx.homedir, ...SETUP_FILE.fishConfD),
      }
    case SHELL.pwsh:
    case SHELL.powershell:
      return {
        kind: TARGET_KIND.block,
        file: await queryProfile(shell, ctx),
      }
  }
}

export default getIntegrationTarget
