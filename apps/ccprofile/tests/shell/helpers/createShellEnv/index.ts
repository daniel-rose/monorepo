import { delimiter, dirname, join } from 'node:path'

import { inject } from 'vitest'

import type { Shell } from '../../../../src/constants'
import { SHELL } from '../../../../src/constants'
import TEST_ENV from '../../constants/TEST_ENV'
import type { FakeVariant } from '../../types'
import findShellBinary from '../findShellBinary'
import toShellPath from '../toShellPath'

type ShellEnvOptions = {
  home: string
  fakeVariant: FakeVariant
  logPath: string
  // false: PATH without the ccprofile shims.
  withShims?: boolean
}

const IS_WINDOWS = process.platform === 'win32'
const POSIX_SYSTEM_DIRS = ['/usr/bin', '/bin']
const LOCALE_KEYS = ['LANG', 'LC_ALL', 'LC_CTYPE']
// What Windows programs (cmd.exe for the .cmd shims, PowerShell) need to
// start; everything else, PSModulePath included, is left to the defaults.
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

const pick = (keys: readonly string[]): Record<string, string> =>
  Object.fromEntries(
    keys.flatMap(key => {
      const value = process.env[key]
      return value === undefined ? [] : [[key, value]]
    })
  )

const windowsSystemDirs = (shell: Shell): string[] => {
  const root = process.env.SystemRoot ?? 'C:\\Windows'
  const dirs = [
    join(root, 'System32'),
    root,
    join(root, 'System32', 'Wbem'),
    join(root, 'System32', 'WindowsPowerShell', 'v1.0'),
  ]
  if (shell !== SHELL.bash) return dirs
  // The npm sh shim calls dirname, sed, uname and cygpath.
  const gitRoot = dirname(dirname(findShellBinary(SHELL.bash)))
  return [...dirs, join(gitRoot, 'usr', 'bin'), join(gitRoot, 'mingw64', 'bin')]
}

// The complete environment of a shell under test: an isolated HOME (and
// Windows profile dirs), no user rc files, no GIT_*, CCPROFILE* or
// CLAUDE_CONFIG_DIR from the host, and PATH = shims + fake claude + node +
// system dirs.
const createShellEnv = (
  shell: Shell,
  options: ShellEnvOptions
): Record<string, string> => {
  const fakeDir = inject('fakeDirs')[options.fakeVariant]
  if (fakeDir === undefined) {
    throw new Error(`fake claude variant ${options.fakeVariant} missing`)
  }
  const pathDirs = [
    ...(options.withShims === false ? [] : [inject('shimDir')]),
    fakeDir,
    inject('nodeDir'),
    ...(IS_WINDOWS ? windowsSystemDirs(shell) : POSIX_SYSTEM_DIRS),
  ]
  const { home } = options
  const fakeEnv = {
    [TEST_ENV.fakeLog]: toShellPath(shell, options.logPath),
  }

  if (IS_WINDOWS) {
    return {
      ...pick(WINDOWS_KEYS),
      PATH: pathDirs.join(delimiter),
      HOME: home,
      USERPROFILE: home,
      APPDATA: join(home, 'AppData', 'Roaming'),
      LOCALAPPDATA: join(home, 'AppData', 'Local'),
      // Git Bash would glob unquoted arguments such as `*` itself.
      MSYS: 'noglob',
      ...fakeEnv,
    }
  }

  return {
    LANG: process.platform === 'darwin' ? 'en_US.UTF-8' : 'C.UTF-8',
    ...pick(LOCALE_KEYS),
    ...pick(['TMPDIR']),
    PATH: pathDirs.join(delimiter),
    HOME: home,
    ZDOTDIR: home,
    XDG_CONFIG_HOME: join(home, '.config'),
    XDG_DATA_HOME: join(home, '.local', 'share'),
    XDG_CACHE_HOME: join(home, '.cache'),
    ...fakeEnv,
  }
}

export default createShellEnv
