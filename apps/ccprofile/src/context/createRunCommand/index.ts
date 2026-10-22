import { spawn } from 'node:child_process'
import { statSync } from 'node:fs'

import { KILL_GRACE_MS } from '../../constants'
import isSafeShellArgs from '../isSafeShellArgs'
import resolveWindowsExecutable from '../resolveWindowsExecutable'
import type { RunCommand, RunCommandResult } from '../types'

const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

const getEnvValue = (
  env: Readonly<Record<string, string | undefined>>,
  name: string
): string | undefined =>
  env[Object.keys(env).find(key => key.toUpperCase() === name) ?? name]

const isBatchFile = (file: string): boolean => /\.(cmd|bat)$/i.test(file)

const failure = (stderr: string): RunCommandResult => ({
  exitCode: null,
  stdout: '',
  stderr,
  timedOut: false,
  notFound: false,
})

const createRunCommand =
  (platform: NodeJS.Platform): RunCommand =>
  (file, args, options = {}) =>
    new Promise(resolve => {
      const env = { ...process.env, ...options.env }
      const executable =
        platform === 'win32' && !/[\\/]/.test(file)
          ? (resolveWindowsExecutable({
              file,
              path: getEnvValue(env, 'PATH') ?? '',
              pathext: getEnvValue(env, 'PATHEXT'),
              isFile,
            }) ?? file)
          : file

      // Node refuses to spawn .cmd/.bat without a shell (CVE-2024-27980), and a
      // shell re-parses the arguments, so only plain ones are let through.
      const useShell = platform === 'win32' && isBatchFile(executable)
      if (useShell && !isSafeShellArgs(args)) {
        resolve(
          failure(`ccprofile: refusing to pass unsafe arguments to ${file}`)
        )
        return
      }

      let stdout = ''
      let stderr = ''
      let timedOut = false
      let settled = false
      let timer: NodeJS.Timeout | undefined
      let killTimer: NodeJS.Timeout | undefined

      const finish = (result: RunCommandResult) => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        clearTimeout(killTimer)
        resolve(result)
      }

      try {
        const child = spawn(
          useShell ? `"${executable}"` : executable,
          [...args],
          {
            cwd: options.cwd,
            env,
            shell: useShell,
            windowsHide: true,
            stdio: [options.input ?? 'ignore', 'pipe', 'pipe'],
          }
        )

        if (options.timeoutMs !== undefined) {
          timer = setTimeout(() => {
            timedOut = true
            child.kill('SIGTERM')
            killTimer = setTimeout(() => {
              child.kill('SIGKILL')
              finish({
                exitCode: null,
                stdout,
                stderr,
                timedOut,
                notFound: false,
              })
            }, KILL_GRACE_MS)
          }, options.timeoutMs)
        }

        child.stdout?.setEncoding('utf8').on('data', chunk => (stdout += chunk))
        child.stderr?.setEncoding('utf8').on('data', chunk => (stderr += chunk))
        child.on('error', (error: NodeJS.ErrnoException) =>
          finish({
            exitCode: null,
            stdout,
            stderr: stderr || error.message,
            timedOut,
            notFound: error.code === 'ENOENT',
          })
        )
        child.on('close', code =>
          finish({ exitCode: code, stdout, stderr, timedOut, notFound: false })
        )
      } catch (error) {
        finish(failure(error instanceof Error ? error.message : String(error)))
      }
    })

export default createRunCommand
