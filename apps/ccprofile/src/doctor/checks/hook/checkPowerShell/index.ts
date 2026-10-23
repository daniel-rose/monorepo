import type { Shell } from '../../../../constants'
import { CHECK_STATUS, SHELL } from '../../../../constants'
import type { Context } from '../../../../context/types'
import {
  getIntegrationTarget,
  hookFilePath,
  ProfileQueryTimeoutError,
} from '../../../../setup'
import fileExists from '../../../fileExists'
import type { CheckResult } from '../../../types'
import checkBlock from '../checkBlock'
import checkHookFile from '../checkHookFile'

const POWERSHELL_LABEL = 'PowerShell'
const POWERSHELLS = [SHELL.pwsh, SHELL.powershell] as const

type Profile = { shell: Shell; file: string }
type Found = Profile | CheckResult | null

const isProfile = (found: Found): found is Profile =>
  found !== null && 'file' in found

// A PowerShell that is not installed (or fails) has no profile to check:
// skipped without a line. One that hangs is reported.
const findProfile = async (shell: Shell, ctx: Context): Promise<Found> => {
  try {
    const { file } = await getIntegrationTarget(shell, ctx)
    return (await fileExists(file)) ? { shell, file } : null
  } catch (error) {
    return error instanceof ProfileQueryTimeoutError
      ? { status: CHECK_STATUS.warn, message: error.message }
      : null
  }
}

// pwsh (7) and powershell.exe (5.1) have separate profiles but share one hook
// file. Both are asked; each profile that exists is checked.
const checkPowerShell = async (ctx: Context): Promise<CheckResult[]> => {
  const hookFile = hookFilePath(SHELL.pwsh, ctx)
  const [answers, hook] = await Promise.all([
    Promise.all(POWERSHELLS.map(async shell => findProfile(shell, ctx))),
    checkHookFile(POWERSHELL_LABEL, hookFile),
  ])

  const found = answers.filter(isProfile)
  const profiles = found.filter(
    (profile, index) =>
      found.findIndex(other => other.file === profile.file) === index
  )
  const timeouts = answers.filter(
    (answer): answer is CheckResult => answer !== null && !isProfile(answer)
  )
  const blocks = await Promise.all(
    profiles.map(async profile =>
      checkBlock(profile.shell, profile.file, hookFile, {
        requireFile: false,
      })
    )
  )

  return [hook, ...timeouts, ...blocks.filter(block => block !== null)]
}

export default checkPowerShell
