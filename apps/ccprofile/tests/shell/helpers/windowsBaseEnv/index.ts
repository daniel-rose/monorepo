import { delimiter, join } from 'node:path'

import pickEnv from '../pickEnv'

// What Windows programs (cmd.exe for the .cmd shims, PowerShell) need to
// start. Everything else is left to the defaults; above all PSModulePath, as
// PowerShell 7's value (the CI step shell) breaks Windows PowerShell 5.1.
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
const windowsBaseEnv = (): Record<string, string> & { PATH: string } => {
  const root = process.env.SystemRoot ?? 'C:\\Windows'
  return {
    ...pickEnv(WINDOWS_KEYS),
    PATH: [
      join(root, 'System32'),
      root,
      join(root, 'System32', 'Wbem'),
      join(root, 'System32', 'WindowsPowerShell', 'v1.0'),
    ].join(delimiter),
  }
}

export default windowsBaseEnv
