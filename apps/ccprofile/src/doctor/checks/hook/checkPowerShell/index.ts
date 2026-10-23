import type { Shell } from '../../../../constants'
import { SHELL } from '../../../../constants'
import type { Context } from '../../../../context/types'
import { getIntegrationTarget, hookFilePath } from '../../../../setup'
import fileExists from '../../../fileExists'
import type { CheckResult } from '../../../types'
import checkBlock from '../checkBlock'
import checkHookFile from '../checkHookFile'

const POWERSHELL_LABEL = 'PowerShell'
const POWERSHELLS = [SHELL.pwsh, SHELL.powershell] as const

type Profile = { shell: Shell; file: string }

// A PowerShell that is not installed (or does not answer) has no profile to
// check: skipped without a line.
const findProfile = async (
  shell: Shell,
  ctx: Context
): Promise<Profile | null> => {
  try {
    const { file } = await getIntegrationTarget(shell, ctx)
    return (await fileExists(file)) ? { shell, file } : null
  } catch {
    return null
  }
}

// pwsh (7) and powershell.exe (5.1) have separate profiles but share one hook
// file. Both are asked; each profile that exists is checked.
const checkPowerShell = async (ctx: Context): Promise<CheckResult[]> => {
  const hookFile = hookFilePath(SHELL.pwsh, ctx)
  const [found, hook] = await Promise.all([
    Promise.all(POWERSHELLS.map(async shell => findProfile(shell, ctx))),
    checkHookFile(POWERSHELL_LABEL, hookFile),
  ])

  const profiles = found.filter(
    (profile, index) =>
      profile !== null &&
      found.findIndex(other => other?.file === profile.file) === index
  )
  const blocks = await Promise.all(
    profiles.map(async profile =>
      profile === null
        ? null
        : checkBlock(profile.shell, profile.file, hookFile, {
            requireFile: false,
          })
    )
  )

  return [hook, ...blocks.filter(block => block !== null)]
}

export default checkPowerShell
