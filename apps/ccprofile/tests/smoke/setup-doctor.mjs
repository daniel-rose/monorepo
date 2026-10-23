// Smoke test of the built CLI on the real OS (CI runs it on Linux, macOS and
// Windows): `init --example`, `setup <shell> --yes` per shell, the startup
// file really loads the hook, `doctor`, then `setup <shell> --remove --yes`.
// Shells: $CCPROFILE_TEST_SHELLS (default: pwsh,powershell,bash on Windows,
// zsh,bash elsewhere). Everything runs in a temp HOME with a fake `claude` on
// PATH. A PowerShell profile outside that HOME (Windows may take the Documents
// folder from the registry, not from USERPROFILE) is only touched on a CI
// runner and restored afterwards.
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, isAbsolute, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const IS_WINDOWS = process.platform === 'win32'
const HERE = dirname(fileURLToPath(import.meta.url))
const ENTRY = join(HERE, '..', '..', 'dist', 'index.js')
const FAKE_CLAUDE = join(HERE, '..', 'fixtures', 'fake-claude-auth.mjs')
const MARKER_START = '# >>> ccprofile >>>'
const UTF8_BOM = [0xef, 0xbb, 0xbf]
const POWERSHELLS = ['pwsh', 'powershell']
const PS_EXECUTABLE = { pwsh: 'pwsh', powershell: 'powershell.exe' }
const HOOK_EXTENSION = {
  zsh: 'zsh',
  bash: 'bash',
  pwsh: 'ps1',
  powershell: 'ps1',
}
const COMMAND_TIMEOUT_MS = 120_000
const SHELLS = (
  process.env.CCPROFILE_TEST_SHELLS ??
  (IS_WINDOWS ? 'pwsh,powershell,bash' : 'zsh,bash')
)
  .split(',')
  .map(shell => shell.trim())
  .filter(shell => shell !== '')

const log = line => process.stdout.write(`${line}\n`)

const check = (condition, message) => {
  if (!condition) throw new Error(`smoke: ${message}`)
}

const root = realpathSync.native(
  mkdtempSync(join(tmpdir(), 'ccprofile-smoke-'))
)
const home = join(root, 'home')
const appData = join(home, 'AppData', 'Roaming')
const configHome = IS_WINDOWS ? appData : join(home, '.config')
const work = join(root, 'work')
const bin = join(root, 'bin')

const inside = (dir, file) => {
  const path = relative(
    IS_WINDOWS ? dir.toLowerCase() : dir,
    IS_WINDOWS ? file.toLowerCase() : file
  )
  return path !== '' && !path.startsWith('..') && !isAbsolute(path)
}

// The caller's environment (so pwsh is found and PSModulePath is inherited as
// in real use), pointed at the temp HOME, without anything that selects a
// profile or a repository.
const createEnv = () => {
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_')) delete env[key]
  }
  for (const key of [
    'CLAUDE_CONFIG_DIR',
    'CCPROFILE',
    'CCPROFILE_CONFIG',
    'CCPROFILE_ARGV',
    'SHELL',
  ]) {
    delete env[key]
  }
  const pathKey =
    Object.keys(env).find(key => key.toUpperCase() === 'PATH') ?? 'PATH'
  return {
    ...env,
    [pathKey]: [bin, env[pathKey] ?? ''].join(delimiter),
    HOME: home,
    USERPROFILE: home,
    APPDATA: appData,
    XDG_CONFIG_HOME: join(home, '.config'),
    ZDOTDIR: home,
    FAKE_AUTH_MODE: 'loggedIn',
  }
}

// `claude.cmd` on Windows (spawned through cmd.exe), a shell script elsewhere.
const installFakeClaude = () => {
  mkdirSync(bin, { recursive: true })
  if (IS_WINDOWS) {
    writeFileSync(
      join(bin, 'claude.cmd'),
      `@"${process.execPath}" "${FAKE_CLAUDE}" %*\r\n`
    )
    return
  }
  const script = join(bin, 'claude')
  writeFileSync(
    script,
    `#!/bin/sh\nexec '${process.execPath}' '${FAKE_CLAUDE}' "$@"\n`
  )
  chmodSync(script, 0o755)
}

// No shell in between; stdout and stderr are kept whatever the exit status.
const run = (file, args, env) => {
  const result = spawnSync(file, args, {
    cwd: work,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: COMMAND_TIMEOUT_MS,
  })
  if (result.error !== undefined) throw result.error
  check(result.status !== null, `${file} ended by ${result.signal}`)
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

const ccprofile = (env, ...args) => {
  log(`$ ccprofile ${args.join(' ')}`)
  const result = run(process.execPath, [ENTRY, ...args], env)
  for (const line of `${result.stdout}${result.stderr}`.trimEnd().split('\n')) {
    log(`  ${line}`)
  }
  log(`  (exit ${result.status})`)
  return result
}

const powerShellEnv = (shell, env) =>
  shell === 'powershell' ? { ...env, PSModulePath: '' } : env

const queryProfile = (shell, env) =>
  run(
    PS_EXECUTABLE[shell],
    ['-NoProfile', '-Command', '$PROFILE.CurrentUserAllHosts'],
    powerShellEnv(shell, env)
  ).stdout.trim()

const findBash = () => {
  if (IS_WINDOWS)
    return join(
      process.env.ProgramFiles ?? 'C:\\Program Files',
      'Git',
      'bin',
      'bash.exe'
    )
  return process.platform === 'darwin' ? '/bin/bash' : 'bash'
}

// Starts the shell the way it reads its startup file and asks whether `claude`
// is now the ccprofile function.
const LOAD_CHECK = {
  zsh: [() => 'zsh', ['-c', '. "$ZDOTDIR/.zshrc" && whence -w claude']],
  bash: [findBash, ['-c', '. ~/.bashrc && declare -F claude']],
  fish: [() => 'fish', ['-c', 'functions -q claude && echo claude']],
  pwsh: [
    () => 'pwsh',
    [
      '-NoProfile',
      '-Command',
      '. $PROFILE.CurrentUserAllHosts; (Get-Command claude).CommandType',
    ],
  ],
  powershell: [
    () => 'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      '. $PROFILE.CurrentUserAllHosts; (Get-Command claude).CommandType',
    ],
  ],
}
const LOADED = {
  zsh: 'claude: function',
  bash: 'claude',
  fish: 'claude',
  pwsh: 'Function',
  powershell: 'Function',
}

const startupFile = (shell, env) => {
  switch (shell) {
    case 'zsh':
      return join(home, '.zshrc')
    case 'bash':
      return join(home, '.bashrc')
    case 'fish':
      return join(home, '.config', 'fish', 'conf.d', 'ccprofile.fish')
    default:
      return queryProfile(shell, env)
  }
}

const hookFile = shell =>
  shell === 'fish'
    ? null
    : join(configHome, 'ccprofile', `hook.${HOOK_EXTENSION[shell]}`)

const containsMarker = file =>
  existsSync(file) && readFileSync(file, 'utf8').includes(MARKER_START)

// Files setup reports (`write`, `remove`, the diff header) must stay in the
// temp HOME, apart from a PowerShell profile already allowed.
// Returns the files named, so a caller can see the parse found something.
const assertWritesInside = (stderr, allowed) => {
  const files = []
  for (const line of stderr.split('\n')) {
    const file = /^(?:write|remove|---|kept) (.+?)(?: – .*)?$/.exec(
      line.trim()
    )?.[1]
    if (file === undefined) continue
    check(
      inside(root, file) || allowed.has(file),
      `setup touched ${file} outside ${root}`
    )
    files.push(file)
  }
  return files
}

const restores = []

const main = () => {
  check(existsSync(ENTRY), `${ENTRY} missing – build first`)
  mkdirSync(home, { recursive: true })
  mkdirSync(work, { recursive: true })
  installFakeClaude()
  const env = createEnv()
  log(`smoke: shells ${SHELLS.join(', ')} in ${root}`)

  const configPath = ccprofile(env, 'config').stdout.trim()
  check(
    inside(root, configPath),
    `config path ${configPath} is not in the temp HOME`
  )
  check(
    ccprofile(env, 'init', '--example').status === 0,
    'init --example failed'
  )
  check(existsSync(configPath), 'init --example wrote no config')

  const targets = new Map()
  const allowed = new Set()
  for (const shell of SHELLS) {
    const file = startupFile(shell, env)
    check(isAbsolute(file), `${shell}: no startup file (${file})`)
    if (!inside(root, file)) {
      check(
        POWERSHELLS.includes(shell),
        `${shell}: ${file} is outside the temp HOME`
      )
      check(
        process.env.GITHUB_ACTIONS === 'true',
        `${shell}: profile ${file} is outside the temp HOME – refusing to touch it outside CI`
      )
      const before = existsSync(file) ? readFileSync(file) : null
      restores.push(() =>
        before === null
          ? rmSync(file, { force: true })
          : writeFileSync(file, before)
      )
      allowed.add(file)
      log(
        `smoke: ${shell} profile ${file} is outside the temp HOME (CI) – restored at the end`
      )
    }
    targets.set(shell, { file, existed: existsSync(file) })
  }

  for (const shell of SHELLS) {
    const { file, existed } = targets.get(shell)
    const result = ccprofile(env, 'setup', shell, '--yes')
    check(result.status === 0, `setup ${shell} failed`)
    check(
      assertWritesInside(result.stderr, allowed).includes(file),
      `setup ${shell} did not report ${file}`
    )
    if (shell === 'fish') {
      check(existsSync(file), `fish: ${file} not written`)
    } else {
      check(containsMarker(file), `${shell}: ${file} has no ccprofile block`)
      check(
        existsSync(hookFile(shell)),
        `${shell}: ${hookFile(shell)} not written`
      )
    }
    if (POWERSHELLS.includes(shell) && !existed) {
      const head = [...readFileSync(file).subarray(0, UTF8_BOM.length)]
      check(
        UTF8_BOM.every((byte, index) => head[index] === byte),
        `${shell}: new profile ${file} has no UTF-8 BOM`
      )
    }

    const [binary, args] = LOAD_CHECK[shell]
    const loaded = run(binary(), args, powerShellEnv(shell, env))
    log(
      `  ${shell} after loading its startup file: ${JSON.stringify(loaded.stdout.trim())}${loaded.stderr === '' ? '' : ` stderr ${JSON.stringify(loaded.stderr.trim())}`}`
    )
    check(
      loaded.status === 0 && loaded.stdout.trim().endsWith(LOADED[shell]),
      `${shell}: claude is not the ccprofile function after loading ${file}`
    )
  }

  const doctor = ccprofile(env, 'doctor')
  check(doctor.status === 0, 'doctor did not exit 0')
  const okLines = doctor.stdout
    .split('\n')
    .filter(line => line.startsWith('ok '))
  for (const shell of SHELLS) {
    const { file } = targets.get(shell)
    const expected =
      shell === 'fish'
        ? `fish hook ${file} is current`
        : `${file} loads the hook`
    check(
      okLines.some(line => line.includes(expected)),
      `doctor: no "ok … ${expected}" line`
    )
  }

  const remaining = [...SHELLS]
  for (const shell of SHELLS) {
    const { file } = targets.get(shell)
    remaining.splice(remaining.indexOf(shell), 1)
    const result = ccprofile(env, 'setup', shell, '--remove', '--yes')
    check(result.status === 0, `setup ${shell} --remove failed`)
    const reported = assertWritesInside(result.stderr, allowed)
    check(
      reported.includes(file),
      `setup ${shell} --remove did not report ${file}`
    )
    if (shell === 'fish') {
      check(!existsSync(file), `fish: ${file} still exists`)
    } else {
      check(
        !containsMarker(file),
        `${shell}: ${file} still has the ccprofile block`
      )
      const shared = remaining.some(
        other => HOOK_EXTENSION[other] === HOOK_EXTENSION[shell]
      )
      check(
        existsSync(hookFile(shell)) === shared,
        `${shell}: ${hookFile(shell)} should ${shared ? 'be kept' : 'be gone'}`
      )
      check(
        result.stderr.includes(`kept ${hookFile(shell)}`) === shared,
        `${shell}: the "kept" note should ${shared ? '' : 'not '}be shown`
      )
    }
    check(
      existsSync(configPath),
      `config ${configPath} gone after setup ${shell} --remove`
    )
  }
  log('smoke: ok')
}

try {
  main()
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exitCode = 1
} finally {
  for (const restore of restores) restore()
  rmSync(root, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200,
  })
}
