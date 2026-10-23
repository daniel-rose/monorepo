import type { Shell } from '../../constants'
import { SHELL, TARGET_KIND } from '../../constants'
import type { Context } from '../../context/types'
import { detectShell, getIntegrationTarget, hookFilePath } from '../../setup'
import fileExists from '../fileExists'

const POWERSHELLS: readonly Shell[] = [SHELL.pwsh, SHELL.powershell]

// Whether `setup` has left its own file for this shell. PowerShell shares one
// hook file; its profile is not looked at here (that needs a PowerShell run).
const hasArtefact = async (shell: Shell, ctx: Context): Promise<boolean> => {
  if (shell === SHELL.fish) {
    const target = await getIntegrationTarget(shell, ctx)
    return target.kind === TARGET_KIND.file && fileExists(target.file)
  }
  return fileExists(hookFilePath(shell, ctx))
}

// The shells doctor checks the hook of: the one from $SHELL, plus every shell
// whose integration file already exists (in SHELL order).
const findShellsInScope = async (ctx: Context): Promise<Shell[]> => {
  const detected = detectShell(ctx)
  const shells = Object.values(SHELL)
  const present = await Promise.all(
    shells.map(async shell => hasArtefact(shell, ctx))
  )
  const detectedPowerShell = detected !== null && POWERSHELLS.includes(detected)

  return shells.filter(
    (shell, index) =>
      present[index] === true ||
      shell === detected ||
      (detectedPowerShell && POWERSHELLS.includes(shell))
  )
}

export default findShellsInScope
