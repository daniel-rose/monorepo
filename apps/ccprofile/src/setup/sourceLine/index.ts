import type { Shell } from '../../constants'
import { SHELL } from '../../constants'

// PowerShell treats the typographic quotes U+2018 to U+201B as single quotes.
const POWERSHELL_QUOTES = /['‘’‚‛]/g

const quoteForPosix = (value: string): string =>
  `'${value.replaceAll("'", "'\\''")}'`

const quoteForPowerShell = (value: string): string =>
  `'${value.replace(POWERSHELL_QUOTES, quote => `${quote}${quote}`)}'`

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
