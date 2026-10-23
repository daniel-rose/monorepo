import type { Shell } from '../../../constants'
import { CHECK_STATUS, DOCTOR_TEXT, SHELL } from '../../../constants'
import findShellsInScope from '../../findShellsInScope'
import type { Check } from '../../types'
import checkPowerShell from './checkPowerShell'
import checkShell from './checkShell'

const POWERSHELLS: readonly Shell[] = [SHELL.pwsh, SHELL.powershell]

// Hook file and startup entry of every shell in scope (see findShellsInScope).
// Strictly read-only; fixing is `ccprofile setup`.
const checkHook: Check = async ctx => {
  const shells = await findShellsInScope(ctx)
  if (shells.length === 0) {
    return [{ status: CHECK_STATUS.warn, message: DOCTOR_TEXT.noHook }]
  }

  const results = await Promise.all([
    ...shells
      .filter(shell => !POWERSHELLS.includes(shell))
      .map(async shell => checkShell(shell, ctx)),
    shells.some(shell => POWERSHELLS.includes(shell))
      ? checkPowerShell(ctx)
      : Promise.resolve([]),
  ])
  return results.flat()
}

export default checkHook
