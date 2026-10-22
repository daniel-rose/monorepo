import pathFlavor from '../../config/pathFlavor'
import readEnv from '../../config/readEnv'
import type { Shell } from '../../constants'
import { ENV_VAR, SETUP_FILE, SETUP_TEXT, SHELL } from '../../constants'
import type { Context } from '../../context/types'
import type { IntegrationTarget } from '../types'

const queryProfile = async (
  shell: typeof SHELL.pwsh | typeof SHELL.powershell,
  ctx: Context
): Promise<string> => {
  const executable = SETUP_FILE.powerShellExecutable[shell]
  const args = SETUP_FILE.powerShellArgs
  // Windows PowerShell 5.1 must not inherit a PowerShell 7 module path from
  // the caller (and starts slowly without any value); pwsh needs no override.
  const result =
    shell === SHELL.powershell
      ? await ctx.runCommand(executable, args, {
          env: SETUP_FILE.powerShellEnv,
        })
      : await ctx.runCommand(executable, args)

  // trim() also drops a UTF-8 byte order mark.
  const file = result.stdout.trim()
  if (result.exitCode !== 0 || file === '') {
    throw new Error(SETUP_TEXT.profileQueryFailed(executable))
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
        kind: 'block',
        file: flavor.join(
          readEnv(ctx, ENV_VAR.zdotdir) ?? ctx.homedir,
          SETUP_FILE.zshrc
        ),
      }
    case SHELL.bash:
      return {
        kind: 'block',
        file: flavor.join(ctx.homedir, SETUP_FILE.bashrc),
      }
    case SHELL.fish:
      return {
        kind: 'file',
        file: flavor.join(ctx.homedir, ...SETUP_FILE.fishConfD),
      }
    case SHELL.pwsh:
    case SHELL.powershell:
      return { kind: 'block', file: await queryProfile(shell, ctx) }
  }
}

export default getIntegrationTarget
