import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

import type { Shell } from '../../../../src/constants'
import { SHELL } from '../../../../src/constants'
import TEST_ENV from '../../constants/TEST_ENV'

const IS_WINDOWS = process.platform === 'win32'
// macOS ships bash 3.2 there; the hook must keep working with it.
const MACOS_BASH = '/bin/bash'

const findOnPath = (name: string): string => {
  const candidates = IS_WINDOWS ? [`${name}.exe`, name] : [name]
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    for (const candidate of candidates) {
      const path = join(dir, candidate)
      if (dir !== '' && existsSync(path)) return path
    }
  }
  throw new Error(`${name} not found on PATH`)
}

// `bash` on a Windows PATH may be the WSL launcher, so Git Bash is named
// explicitly there.
const findBash = (): string => {
  const explicit = process.env[TEST_ENV.bash]
  if (explicit !== undefined && explicit !== '') return explicit
  if (IS_WINDOWS) {
    return join(
      process.env.ProgramFiles ?? 'C:\\Program Files',
      'Git',
      'bin',
      'bash.exe'
    )
  }
  return process.platform === 'darwin' ? MACOS_BASH : findOnPath('bash')
}

// Absolute path of the shell binary, looked up once with the test runner's
// PATH (the shell itself later runs with a reduced PATH).
const findShellBinary = (shell: Shell): string =>
  shell === SHELL.bash ? findBash() : findOnPath(shell)

export default findShellBinary
