// Temporary diagnostic: which environment variable (or PATH entry) keeps
// Windows PowerShell 5.1 from running a cmdlet in 0.3 s?
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const root = process.env.SystemRoot ?? 'C:\\Windows'
const ps = join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
const CMD = 'ConvertTo-Json -InputObject @("a") -Compress'
const CURATED_PATH = [join(root, 'System32'), root, join(root, 'System32', 'Wbem'), join(root, 'System32', 'WindowsPowerShell', 'v1.0')].join(';')

const time = (label, env) =>
  new Promise(resolve => {
    const t = Date.now()
    const child = spawn(ps, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', CMD], { env, windowsHide: true })
    child.stdout.resume()
    child.stderr.resume()
    const timer = setTimeout(() => child.kill(), 90000)
    child.on('close', () => {
      clearTimeout(timer)
      resolve({ label, ms: Date.now() - t })
    })
    child.stdin.end('')
  })

const jobs = [
  ['host env', { ...process.env }],
  ['host env, curated PATH', { ...process.env, PATH: CURATED_PATH }],
]
const KEEP = ['SystemRoot', 'SystemDrive', 'windir', 'ComSpec', 'PATHEXT', 'TEMP', 'TMP', 'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS', 'USERNAME', 'COMPUTERNAME']
const curated = { PATH: process.env.PATH }
for (const k of KEEP) if (process.env[k] !== undefined) curated[k] = process.env[k]
jobs.push(['curated vars, host PATH', curated])
for (const key of Object.keys(process.env)) {
  const env = { ...process.env }
  delete env[key]
  jobs.push([`host env minus ${key}`, env])
}

const results = []
const queue = [...jobs]
const worker = async () => {
  for (let job = queue.shift(); job !== undefined; job = queue.shift()) {
    results.push(await time(...job))
  }
}
await Promise.all(Array.from({ length: 6 }, worker))
for (const r of results.sort((a, b) => b.ms - a.ms)) console.log(`DIAG ${r.ms} ms | ${r.label}`)
