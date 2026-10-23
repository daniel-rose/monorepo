import type { Shell } from '../../constants'
import { MARKER_UPDATE_STATUS, SHELL, TARGET_KIND } from '../../constants'
import type { Context } from '../../context/types'
import {
  detectShell,
  getIntegrationTarget,
  hookFilePath,
  readText,
  updateMarkerBlock,
} from '../../setup'
import fileExists from '../fileExists'

const POWERSHELLS: readonly Shell[] = [SHELL.pwsh, SHELL.powershell]

// A startup file with a ccprofile block (even a broken one) sources the hook
// file, so a missing hook file is a fault to report. An unreadable file says
// nothing here.
const hasBlock = async (file: string): Promise<boolean> => {
  try {
    const text = await readText(file, { lenient: true })
    return (
      text !== null &&
      updateMarkerBlock(text, null).status !== MARKER_UPDATE_STATUS.unchanged
    )
  } catch {
    return false
  }
}

// Whether `setup` has left something for this shell: its own file, or for
// zsh and bash a block in the startup file. PowerShell shares one hook file;
// its profile is not looked at here (that needs a PowerShell run).
const hasArtefact = async (shell: Shell, ctx: Context): Promise<boolean> => {
  if (shell === SHELL.fish) {
    const target = await getIntegrationTarget(shell, ctx)
    return target.kind === TARGET_KIND.file && fileExists(target.file)
  }
  if (await fileExists(hookFilePath(shell, ctx))) return true
  // Asking PowerShell for its profile means running it.
  if (POWERSHELLS.includes(shell)) return false

  const target = await getIntegrationTarget(shell, ctx)
  return target.kind === TARGET_KIND.block && (await hasBlock(target.file))
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
