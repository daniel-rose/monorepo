// Temporary diagnostic: which PSModulePath entries make Windows PowerShell 5.1
// run a cmdlet in 0.3 s instead of 25 s in the curated environment?
import { spawn } from 'node:child_process'

const root = process.env.SystemRoot ?? 'C:\\Windows'
const ps = `${root}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
const CMD = 'ConvertTo-Json -InputObject @("a") -Compress; $PSVersionTable.PSVersion.ToString(); $env:PSModulePath'
const SLOW_MS = 8000
const KEEP = ['SystemRoot', 'SystemDrive', 'windir', 'ComSpec', 'PATHEXT', 'TEMP', 'TMP', 'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS', 'USERNAME', 'COMPUTERNAME']
const PATH = [`${root}\\System32`, root, `${root}\\System32\\Wbem`, `${root}\\System32\\WindowsPowerShell\\v1.0`].join(';')
const curated = { PATH }
for (const k of KEEP) if (process.env[k] !== undefined) curated[k] = process.env[k]

const run = entries =>
  new Promise(resolve => {
    const t = Date.now()
    const env = { ...curated }
    if (entries !== null) env.PSModulePath = entries.join(';')
    const child = spawn(ps, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', CMD], { env, windowsHide: true })
    let out = ''
    child.stdout.on('data', c => (out += c))
    child.stderr.resume()
    const timer = setTimeout(() => child.kill(), 60000)
    child.on('close', code => {
      clearTimeout(timer)
      resolve({ ms: Date.now() - t, out: out.trim().replaceAll('\r\n', ' / ').slice(0, 300), code })
    })
    child.stdin.end('')
  })

let entries = (process.env.PSModulePath ?? '').split(';').filter(Boolean)
entries.forEach((e, i) => console.log(`DIAG entry ${i}: ${e}`))
console.log('DIAG unset', JSON.stringify(await run(null)))
console.log('DIAG empty', JSON.stringify(await run([])))
console.log('DIAG all', JSON.stringify(await run(entries)))
for (let size = Math.ceil(entries.length / 2); size >= 1; size = size === 1 ? 0 : Math.ceil(size / 2)) {
  for (let i = 0; i < entries.length; ) {
    const trial = [...entries.slice(0, i), ...entries.slice(i + size)]
    if ((await run(trial)).ms < SLOW_MS) entries = trial
    else i += size
  }
}
console.log('DIAG minimal entries:', entries.join(' | '))
console.log('DIAG minimal result', JSON.stringify(await run(entries)))
