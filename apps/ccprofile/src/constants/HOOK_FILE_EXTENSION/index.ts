import type { Shell } from '../SHELL/types'

const HOOK_FILE_EXTENSION: Readonly<
  Record<Shell, 'zsh' | 'bash' | 'fish' | 'ps1'>
> = {
  zsh: 'zsh',
  bash: 'bash',
  fish: 'fish',
  pwsh: 'ps1',
  powershell: 'ps1',
}

export default HOOK_FILE_EXTENSION
