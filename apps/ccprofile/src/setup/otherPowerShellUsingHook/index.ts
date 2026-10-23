import type { Shell } from '../../constants'
import { MARKER_UPDATE_STATUS, SHELL } from '../../constants'
import type { Context } from '../../context/types'
import getIntegrationTarget from '../getIntegrationTarget'
import readText from '../readText'
import updateMarkerBlock from '../updateMarkerBlock'

const OTHER_POWERSHELL: Partial<Record<Shell, Shell>> = {
  [SHELL.pwsh]: SHELL.powershell,
  [SHELL.powershell]: SHELL.pwsh,
}

const queryProfile = async (
  shell: Shell,
  ctx: Context
): Promise<string | null> => {
  try {
    return (await getIntegrationTarget(shell, ctx)).file
  } catch {
    return null
  }
}

const readProfile = async (file: string): Promise<string | null> => {
  try {
    return await readText(file, { lenient: true })
  } catch {
    return null
  }
}

// pwsh and powershell.exe share one hook file. Returns the other PowerShell if
// its profile (not `profile`) still has a ccprofile block, so the hook file
// must stay. Best effort: a PowerShell that is not installed, does not answer
// or has no readable profile does not use it.
const otherPowerShellUsingHook = async (
  shell: Shell,
  profile: string,
  ctx: Context
): Promise<Shell | null> => {
  const other = OTHER_POWERSHELL[shell]
  if (other === undefined) return null

  const file = await queryProfile(other, ctx)
  if (file === null || file === profile) return null
  const text = await readProfile(file)
  if (text === null) return null

  // A broken block still counts: the profile may well source the hook.
  return updateMarkerBlock(text, null).status === MARKER_UPDATE_STATUS.unchanged
    ? null
    : other
}

export default otherPowerShellUsingHook
