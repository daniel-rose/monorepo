// Names and commands `setup` needs to find the shell integration points.
const SETUP_FILE = {
  zshrc: '.zshrc',
  bashrc: '.bashrc',
  bashProfile: '.bash_profile',
  // Relative to the home directory; fish reads every file in conf.d.
  fishConfD: ['.config', 'fish', 'conf.d', 'ccprofile.fish'],
  // pwsh and powershell.exe differ in the executable name only.
  powerShellExecutable: { pwsh: 'pwsh', powershell: 'powershell.exe' },
  powerShellArgs: [
    '-NoProfile',
    '-Command',
    '[Console]::OutputEncoding=[Text.Encoding]::UTF8; $PROFILE.CurrentUserAllHosts',
  ],
  // An empty value (not an unset variable): Windows PowerShell 5.1 then skips
  // the slow machine default module path and loads only its built-in modules.
  powerShellEnv: { PSModulePath: '' },
} as const

export default SETUP_FILE
