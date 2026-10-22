// Temporary diagnostic: what makes Windows PowerShell 5.1 start slowly?
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = process.env.SystemRoot ?? 'C:\\Windows'
const ps = join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
const KEYS = ['SystemRoot', 'SystemDrive', 'windir', 'ComSpec', 'PATHEXT', 'TEMP', 'TMP', 'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS', 'USERNAME', 'COMPUTERNAME']
const base = () => {
  const env = {}
  for (const k of KEYS) if (process.env[k] !== undefined) env[k] = process.env[k]
  env.PATH = [join(root, 'System32'), root, join(root, 'System32', 'Wbem'), join(root, 'System32', 'WindowsPowerShell', 'v1.0')].join(';')
  return env
}
const fresh = () => {
  const home = mkdtempSync(join(tmpdir(), 'diag-home-'))
  mkdirSync(join(home, 'AppData', 'Local'), { recursive: true })
  mkdirSync(join(home, 'AppData', 'Roaming'), { recursive: true })
  return { HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData', 'Roaming'), LOCALAPPDATA: join(home, 'AppData', 'Local') }
}
const modDir = join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules')
const variants = {
  'host env': () => ({ ...process.env }),
  'curated, fresh profile dirs': () => ({ ...base(), ...fresh() }),
  'curated, real profile dirs': () => ({ ...base(), HOME: process.env.USERPROFILE, USERPROFILE: process.env.USERPROFILE, APPDATA: process.env.APPDATA, LOCALAPPDATA: process.env.LOCALAPPDATA }),
  'curated, fresh, PSModulePath=system only': () => ({ ...base(), ...fresh(), PSModulePath: modDir }),
}
const commands = {
  'noop': '1',
  'Get-Command missing (Application,ExternalScript)': 'Get-Command -Name ccprofile -CommandType ExternalScript,Application -ErrorAction SilentlyContinue | Select-Object -First 1',
  'ConvertTo-Json': 'ConvertTo-Json -InputObject @("a") -Compress',
}
const time = (env, command, closeStdin) => {
  const t = process.hrtime.bigint()
  spawnSync(ps, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { env, input: closeStdin ? '' : undefined, stdio: closeStdin ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'], windowsHide: true, timeout: 120000 })
  return Number((process.hrtime.bigint() - t) / 1000000n)
}
console.log('PSModulePath (host):', process.env.PSModulePath)
for (const [vname, mk] of Object.entries(variants)) {
  for (const [cname, cmd] of Object.entries(commands)) {
    const runs = [0, 1, 2].map(() => time(mk(), cmd, true))
    console.log(`DIAG ${vname} | ${cname}: ${runs.join(' ')} ms`)
  }
}
