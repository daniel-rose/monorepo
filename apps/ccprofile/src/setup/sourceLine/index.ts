import type { Shell } from '../../constants'
import { SHELL } from '../../constants'

const quoteForPosix = (value: string): string =>
  `'${value.replaceAll("'", "'\\''")}'`

const quoteForPowerShell = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`

// The line the startup file uses to load the hook. Single-quoted, so spaces and
// non-ASCII characters in the path stay literal; fish has no such line (its
// conf.d file is the hook itself).
const sourceLine = (shell: Shell, hookFile: string): string => {
  switch (shell) {
    case SHELL.zsh:
    case SHELL.bash:
      return `source ${quoteForPosix(hookFile)}`
    case SHELL.pwsh:
    case SHELL.powershell:
      return `. ${quoteForPowerShell(hookFile)}`
    case SHELL.fish:
      throw new Error('fish needs no source line')
  }
}

export default sourceLine
