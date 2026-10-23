// The shells ccprofile ships a hook for. `pwsh` (PowerShell 7) and
// `powershell` (Windows PowerShell 5.1) share one hook file.
const SHELL = {
  zsh: 'zsh',
  bash: 'bash',
  fish: 'fish',
  pwsh: 'pwsh',
  powershell: 'powershell',
} as const

export default SHELL
