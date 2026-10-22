// Temporary diagnostic: the smallest set of host environment variables that,
// added to the curated environment, makes Windows PowerShell 5.1 run a cmdlet
// in 0.3 s instead of 25 s (delta debugging).
import { spawn } from 'node:child_process'

const root = process.env.SystemRoot ?? 'C:\\Windows'
const ps = `${root}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
const CMD = 'ConvertTo-Json -InputObject @("a") -Compress'
const SLOW_MS = 8000
const KEEP = ['SystemRoot', 'SystemDrive', 'windir', 'ComSpec', 'PATHEXT', 'TEMP', 'TMP', 'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS', 'USERNAME', 'COMPUTERNAME']
const PATH = [`${root}\\System32`, root, `${root}\\System32\\Wbem`, `${root}\\System32\\WindowsPowerShell\\v1.0`].join(';')

const time = env =>
  new Promise(resolve => {
    const t = Date.now()
    const child = spawn(ps, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', CMD], { env, windowsHide: true })
    child.stdout.resume()
    child.stderr.resume()
    const timer = setTimeout(() => child.kill(), 60000)
    child.on('close', () => {
      clearTimeout(timer)
      resolve(Date.now() - t)
    })
    child.stdin.end('')
  })

const curated = { PATH }
for (const k of KEEP) if (process.env[k] !== undefined) curated[k] = process.env[k]
const keyOf = k => k.toLowerCase()
const keptKeys = new Set(KEEP.map(keyOf))
let missing = Object.keys(process.env).filter(k => !keptKeys.has(keyOf(k)) && keyOf(k) !== 'path')
const build = keys => {
  const env = { ...curated }
  for (const k of keys) env[k] = process.env[k]
  return env
}

console.log(`DIAG curated alone: ${await time(curated)} ms`)
console.log(`DIAG curated + all ${missing.length} other host vars: ${await time(build(missing))} ms`)
for (let size = Math.ceil(missing.length / 2); size >= 1; size = size === 1 ? 0 : Math.ceil(size / 2)) {
  for (let i = 0; i < missing.length; ) {
    const trial = [...missing.slice(0, i), ...missing.slice(i + size)]
    if ((await time(build(trial))) < SLOW_MS) {
      missing = trial
    } else {
      i += size
    }
  }
  console.log(`DIAG after chunk ${size}: ${missing.join(', ')}`)
}
console.log(`DIAG minimal set: ${missing.map(k => `${k}=${String(process.env[k]).slice(0, 60)}`).join(' | ')}`)
