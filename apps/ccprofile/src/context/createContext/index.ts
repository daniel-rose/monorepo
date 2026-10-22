import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'

import type { Context, RunCommand } from '../types'

const isFile = (path: string): boolean => {
  try {
    return existsSync(path) && statSync(path).isFile()
  } catch {
    return false
  }
}

// Windows: execFile without a shell does not apply PATHEXT, so a bare name
// like `claude` (a `.cmd` shim) is resolved by hand.
const resolveWindowsExecutable = (
  file: string,
  env: Readonly<Record<string, string | undefined>>
): string => {
  if (/[\\/]/.test(file)) {
    return file
  }
  const pathKey = Object.keys(env).find(key => key.toUpperCase() === 'PATH')
  const pathextKey = Object.keys(env).find(
    key => key.toUpperCase() === 'PATHEXT'
  )
  const dirs = ((pathKey && env[pathKey]) || '').split(delimiter)
  const exts = ((pathextKey && env[pathextKey]) || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .filter(Boolean)

  for (const dir of dirs.filter(Boolean)) {
    for (const ext of ['', ...exts]) {
      const candidate = join(dir, file + ext)
      if (isFile(candidate)) {
        return candidate
      }
    }
  }
  return file
}

const createRunCommand =
  (platform: NodeJS.Platform): RunCommand =>
  (file, args, options = {}) =>
    new Promise(resolve => {
      const env = { ...process.env, ...options.env }
      const executable =
        platform === 'win32' ? resolveWindowsExecutable(file, env) : file
      let stdout = ''
      let stderr = ''
      let timedOut = false
      let settled = false

      const child = spawn(executable, [...args], {
        cwd: options.cwd,
        env,
        shell: false,
        windowsHide: true,
        stdio: [options.input ?? 'ignore', 'pipe', 'pipe'],
      })

      const timer =
        options.timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              timedOut = true
              child.kill()
            }, options.timeoutMs)

      const finish = (exitCode: number | null, notFound: boolean) => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        resolve({ exitCode, stdout, stderr, timedOut, notFound })
      }

      child.stdout?.setEncoding('utf8').on('data', chunk => (stdout += chunk))
      child.stderr?.setEncoding('utf8').on('data', chunk => (stderr += chunk))
      child.on('error', error =>
        finish(null, (error as NodeJS.ErrnoException).code === 'ENOENT')
      )
      child.on('close', code => finish(code, false))
    })

const createContext = (): Context => ({
  cwd: process.cwd(),
  env: process.env,
  platform: process.platform,
  homedir: homedir(),
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  runCommand: createRunCommand(process.platform),
})

export default createContext
