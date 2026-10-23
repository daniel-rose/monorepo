import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import type { TestProject } from 'vitest/node'

import { SHELL } from '../../../src/constants'
import findPackageRoot from '../../../src/context/findPackageRoot'
import FAKE_VARIANT from '../constants/FAKE_VARIANT'
import requestedShells from '../helpers/requestedShells'
import windowsBaseEnv from '../helpers/windowsBaseEnv'
import type { FakeVariant } from '../types'

const IS_WINDOWS = process.platform === 'win32'
const PACKAGE_PATH = ['@daniel-rose', 'ccprofile'] as const
const EXECUTABLE_MODE = 0o755

// npm is run through node with its own CLI script, so no `.cmd` shim (and no
// shell) is involved on Windows. setup-node and nvm share this layout.
const findNpmCli = (): string => {
  const nodeDir = dirname(process.execPath)
  const cli = IS_WINDOWS
    ? join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js')
    : join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')
  if (!existsSync(cli)) throw new Error(`npm not found next to node: ${cli}`)
  return cli
}

// Without the caller's npm_config_* (pnpm sets some for scripts) and with an
// empty user/global config, so neither the user's registry nor prefix leaks in.
const createNpm = (tmp: string) => {
  const cli = findNpmCli()
  const userRc = join(tmp, 'user-npmrc')
  const globalRc = join(tmp, 'global-npmrc')
  writeFileSync(userRc, '')
  writeFileSync(globalRc, '')
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.toLowerCase().startsWith('npm_config_')
    )
  )
  const common = [
    '--userconfig',
    userRc,
    '--globalconfig',
    globalRc,
    '--cache',
    join(tmp, 'npm-cache'),
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--loglevel',
    'error',
  ]
  return (...args: string[]): string =>
    execFileSync(process.execPath, [cli, ...args, ...common], {
      cwd: tmp,
      env,
      encoding: 'utf8',
    })
}

// Installs the packed package into a throwaway global prefix, which gives the
// shims a real `npm install -g` creates (POSIX: <prefix>/bin/ccprofile;
// Windows: <prefix>\ccprofile.cmd, .ps1 and the sh shim).
const installPackage = (tmp: string) => {
  const npm = createNpm(tmp)
  const [packed] = JSON.parse(
    npm('pack', findPackageRoot(), '--pack-destination', tmp, '--json')
  ) as [{ filename: string }]
  const prefix = join(tmp, 'prefix')
  npm('install', '--global', '--prefix', prefix, join(tmp, packed.filename))

  return IS_WINDOWS
    ? {
        shimDir: prefix,
        hookDir: join(prefix, 'node_modules', ...PACKAGE_PATH, 'hooks'),
      }
    : {
        shimDir: join(prefix, 'bin'),
        hookDir: join(prefix, 'lib', 'node_modules', ...PACKAGE_PATH, 'hooks'),
      }
}

// POSIX: a directory holding only `node`, so PATH does not also expose
// whatever else (a global ccprofile) lives next to the real node binary.
const createNodeDir = (tmp: string): string => {
  if (IS_WINDOWS) return dirname(process.execPath)
  const dir = join(tmp, 'node-bin')
  mkdirSync(dir)
  symlinkSync(process.execPath, join(dir, 'node'))
  return dir
}

const fixture = (name: string): string =>
  join(findPackageRoot(), 'tests', 'shell', 'fixtures', name)

const createPosixFake = (dir: string): void => {
  const target = join(dir, 'claude')
  copyFileSync(fixture('fake-claude.sh'), target)
  chmodSync(target, EXECUTABLE_MODE)
}

const createCmdFake = (dir: string): void => {
  writeFileSync(
    join(dir, 'claude.cmd'),
    `@"${process.execPath}" "${fixture('fake-claude.mjs')}" %*\r\n`
  )
}

// Windows PowerShell 5.1 with the curated env: the inherited PSModulePath of
// a PowerShell 7 parent would make it load 7's modules and fail Add-Type.
const createExeFake = (dir: string): void => {
  const source = fixture('FakeClaude.cs')
  const target = join(dir, 'claude.exe')
  const env = windowsBaseEnv()
  execFileSync(
    join(
      process.env.SystemRoot ?? 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe'
    ),
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Add-Type -TypeDefinition ([IO.File]::ReadAllText('${source}')) -OutputAssembly '${target}' -OutputType ConsoleApplication`,
    ],
    { stdio: 'inherit', env, windowsHide: true }
  )
}

const FAKE_FACTORY: Readonly<Record<FakeVariant, (dir: string) => void>> = {
  posix: createPosixFake,
  cmd: createCmdFake,
  exe: createExeFake,
}

// One directory per variant, each holding only that fake.
const createFakes = (
  tmp: string,
  variants: readonly FakeVariant[]
): Partial<Record<FakeVariant, string>> =>
  Object.fromEntries(
    variants.map(variant => {
      const dir = join(tmp, `fake-${variant}`)
      mkdirSync(dir)
      FAKE_FACTORY[variant](dir)
      return [variant, dir]
    })
  )

const fakeVariantsFor = (shells: readonly string[]): FakeVariant[] => {
  const usesPowerShell = shells.some(
    shell => shell === SHELL.pwsh || shell === SHELL.powershell
  )
  return IS_WINDOWS && usesPowerShell
    ? [FAKE_VARIANT.posix, FAKE_VARIANT.cmd, FAKE_VARIANT.exe]
    : [FAKE_VARIANT.posix]
}

const setup = (project: TestProject): (() => void) | undefined => {
  const shells = requestedShells()
  if (shells.length === 0) return undefined

  const dist = join(findPackageRoot(), 'dist', 'index.js')
  if (!existsSync(dist)) {
    throw new Error(
      `${dist} is missing: run \`pnpm --filter ./apps/ccprofile build\` before test:shell`
    )
  }

  const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'ccprofile-shell-')))
  const { shimDir, hookDir } = installPackage(tmp)
  project.provide('shimDir', shimDir)
  project.provide('hookDir', hookDir)
  project.provide('nodeDir', createNodeDir(tmp))
  project.provide('fakeDirs', createFakes(tmp, fakeVariantsFor(shells)))

  return () => rmSync(tmp, { recursive: true, force: true })
}

export default setup
