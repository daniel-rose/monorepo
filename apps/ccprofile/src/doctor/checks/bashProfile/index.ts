import {
  CHECK_STATUS,
  DOCTOR_PATTERN,
  DOCTOR_TEXT,
  SHELL,
} from '../../../constants'
import { checkBashProfile } from '../../../setup'
import findShellsInScope from '../../findShellsInScope'
import type { Check } from '../../types'

const LOGIN_SHELL_PLATFORMS: readonly NodeJS.Platform[] = ['darwin', 'win32']

// Only where bash opens login shells by default, and only when bash is one of
// the shells doctor looks at (a zsh-only Mac has no use for ~/.bash_profile).
const checkBashProfileSource: Check = async ctx => {
  if (!LOGIN_SHELL_PLATFORMS.includes(ctx.platform)) return []
  if (!(await findShellsInScope(ctx)).includes(SHELL.bash)) return []

  const warning = await checkBashProfile(ctx)
  return [
    warning === null
      ? { status: CHECK_STATUS.ok, message: DOCTOR_TEXT.bashProfileOk }
      : {
          status: CHECK_STATUS.warn,
          message: warning.replace(DOCTOR_PATTERN.setupWarningPrefix, ''),
        },
  ]
}

export default checkBashProfileSource
