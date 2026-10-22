import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { inject } from 'vitest'

import type { Shell } from '../../../../src/constants'
import { HOOK_FILE_EXTENSION, SHELL } from '../../../../src/constants'
import SCENARIO from '../../constants/SCENARIO'
import TEST_ENV from '../../constants/TEST_ENV'
import type { Scenario, ShellResult } from '../../types'
import findShellBinary from '../findShellBinary'
import scenarioScript from '../scenarioScript'
import toShellPath from '../toShellPath'

type RunHookOptions = {
  cwd: string
  env: Record<string, string>
  stdin?: string
  scenario?: Scenario
}

type Invocation = { file: string; args: string[]; cleanup: () => void }

const NAME_FOR_DOLLAR_ZERO = 'ccprofile-test'
const POWERSHELL_FLAGS = [
  '-NoLogo',
  '-NoProfile',
  '-NonInteractive',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
]
const UTF8_BOM = String.fromCharCode(0xfeff)
const noop = (): void => undefined

const encodeBase64 = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64')

// The driver rebuilds the arguments from base64, so neither the command line
// nor the file encoding can alter them, then loads the hook.
const writePowerShellDriver = (args: string[], scenario: Scenario) => {
  const dir = mkdtempSync(join(tmpdir(), 'ccprofile-driver-'))
  const file = join(dir, 'driver.ps1')
  const lines = [
    '$argList = [System.Collections.Generic.List[string]]::new()',
    ...args.map(
      arg =>
        `$argList.Add([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${encodeBase64(arg)}')))`
    ),
    '$a = $argList.ToArray()',
    `. $env:${TEST_ENV.hook}`,
    scenarioScript(SHELL.pwsh, scenario),
  ]
  writeFileSync(file, `${UTF8_BOM}${lines.join('\n')}\n`)
  return { file, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

const createInvocation = (
  shell: Shell,
  args: string[],
  scenario: Scenario
): Invocation => {
  const file = findShellBinary(shell)
  const script = scenarioScript(shell, scenario)

  switch (shell) {
    case SHELL.zsh:
      return {
        file,
        args: ['-f', '-c', script, NAME_FOR_DOLLAR_ZERO, ...args],
        cleanup: noop,
      }
    case SHELL.bash:
      return {
        file,
        args: [
          '--norc',
          '--noprofile',
          '-c',
          script,
          NAME_FOR_DOLLAR_ZERO,
          ...args,
        ],
        cleanup: noop,
      }
    case SHELL.fish:
      return {
        file,
        args: ['--no-config', '-c', script, ...args],
        cleanup: noop,
      }
    case SHELL.pwsh:
    case SHELL.powershell: {
      const driver = writePowerShellDriver(args, scenario)
      return {
        file,
        args: [...POWERSHELL_FLAGS, driver.file],
        cleanup: driver.cleanup,
      }
    }
  }
}

// Starts `shell` without any user configuration, loads the hook and runs the
// scenario with `args` as the claude arguments.
const runHook = (
  shell: Shell,
  args: string[],
  options: RunHookOptions
): Promise<ShellResult> => {
  const scenario = options.scenario ?? SCENARIO.call
  const invocation = createInvocation(shell, args, scenario)
  // The hook files of the installed package, not the ones in the repo.
  const hook = join(
    inject('hookDir'),
    `ccprofile.${HOOK_FILE_EXTENSION[shell]}`
  )

  return new Promise((resolve, reject) => {
    const child = spawn(invocation.file, invocation.args, {
      cwd: options.cwd,
      env: { ...options.env, [TEST_ENV.hook]: toShellPath(shell, hook) },
      windowsHide: true,
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', error => {
      invocation.cleanup()
      reject(error)
    })
    child.on('close', code => {
      invocation.cleanup()
      resolve({
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        exitCode: code ?? -1,
      })
    })
    child.stdin.end(options.stdin ?? '')
  })
}

export default runHook
