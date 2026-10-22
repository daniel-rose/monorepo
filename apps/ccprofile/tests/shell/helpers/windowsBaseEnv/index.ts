import { delimiter, join } from 'node:path'

import pickEnv from '../pickEnv'

// What Windows programs (cmd.exe for the .cmd shims, PowerShell) need to
// start. Everything else is left to the defaults; PSModulePath is never
// inherited, as PowerShell 7's value (the CI step shell) breaks Windows
// PowerShell 5.1.
const WINDOWS_KEYS = [
  'SystemRoot',
  'SystemDrive',
  'windir',
  'ComSpec',
  'PATHEXT',
  'TEMP',
  'TMP',
  'ProgramData',
  'ProgramFiles',
  'ProgramFiles(x86)',
  'ProgramW6432',
  'CommonProgramFiles',
  'CommonProgramFiles(x86)',
  'CommonProgramW6432',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
  'OS',
  'USERNAME',
  'COMPUTERNAME',
]

// The curated Windows environment with PATH = the system directories only.
// PSModulePath is set but empty: unset, Windows PowerShell 5.1 takes the
// machine default (on the GitHub runners including the Az modules) and then
// needs 20 s or more for its first cmdlet (measured: ConvertTo-Json 22 s,
// at times past the 60 s test timeout); empty, it uses only its own modules
// (1.3 s). The hook needs nothing but the built-in cmdlets.
const windowsBaseEnv = (): Record<string, string> & { PATH: string } => {
  const root = process.env.SystemRoot ?? 'C:\\Windows'
  return {
    ...pickEnv(WINDOWS_KEYS),
    PSModulePath: '',
    PATH: [
      join(root, 'System32'),
      root,
      join(root, 'System32', 'Wbem'),
      join(root, 'System32', 'WindowsPowerShell', 'v1.0'),
    ].join(delimiter),
  }
}

export default windowsBaseEnv
