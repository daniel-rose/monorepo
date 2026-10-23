import type { Shell } from '../../../../src/constants'
import { SHELL } from '../../../../src/constants'

// Git Bash takes `C:/…`; every other shell gets the native path.
const toShellPath = (shell: Shell, path: string): string =>
  process.platform === 'win32' && shell === SHELL.bash
    ? path.replaceAll('\\', '/')
    : path

export default toShellPath
