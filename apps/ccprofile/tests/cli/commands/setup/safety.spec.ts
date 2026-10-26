import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import setup from '../../../../src/cli/commands/setup'
import type { ExitCode } from '../../../../src/constants'
import { MARKER } from '../../../../src/constants'
import type { RunCommand } from '../../../../src/context/types'
import { confirm } from '../../../../src/prompt'
import createSandbox from '../../../helpers/createSandbox'

vi.mock('../../../../src/prompt')

type Sandbox = Awaited<ReturnType<typeof createSandbox>>

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf])

describe('setup safety', () => {
  let sandbox: Sandbox
  let runInit: ReturnType<typeof vi.fn<() => Promise<ExitCode>>>
  let deps: { runInit: () => Promise<ExitCode> }

  beforeEach(async () => {
    sandbox = await createSandbox()
    runInit = vi.fn<() => Promise<ExitCode>>(() => Promise.resolve(0))
    deps = { runInit }
  })

  afterEach(async () => {
    await sandbox.cleanup()
  })

  // Posix path rules, everything inside the sandbox.
  const makeCtx = (
    extra: {
      env?: Record<string, string>
      stdin?: PassThrough & { isTTY: boolean }
      runCommand?: RunCommand
    } = {}
  ) => {
    const { env, ...rest } = extra
    return {
      ...sandbox.ctx(sandbox.home, {
        HOME: sandbox.home,
        ZDOTDIR: sandbox.home,
        XDG_CONFIG_HOME: join(sandbox.home, '.config'),
        APPDATA: join(sandbox.home, 'AppData', 'Roaming'),
        ...env,
      }),
      platform: 'linux' as NodeJS.Platform,
      ...rest,
    }
  }

  const hookFile = (ext: string, configHome = join(sandbox.home, '.config')) =>
    join(configHome, 'ccprofile', `hook.${ext}`)
  const profile = () => join(sandbox.home, 'Documents', 'profile.ps1')

  const answering = (stdout: string): RunCommand =>
    vi.fn<RunCommand>(() => {
      mkdirSync(dirname(profile()), { recursive: true })
      return Promise.resolve({
        exitCode: 0,
        stdout,
        stderr: '',
        timedOut: false,
        notFound: false,
      })
    })

  const profileQuery = () => answering(`${profile()}\r\n`)

  describe('non-UTF-8 files', () => {
    it('refuses a UTF-16LE profile and writes nothing', async () => {
      await sandbox.writeConfig({ profiles: [] })
      mkdirSync(dirname(profile()), { recursive: true })
      const bytes = Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from('Set-Alias x y\r\n', 'utf16le'),
      ])
      writeFileSync(profile(), bytes)

      const ctx = makeCtx({ runCommand: profileQuery() })
      expect(await setup(ctx, 'powershell', { yes: true }, deps)).toBe(1)

      expect(readFileSync(profile())).toEqual(bytes)
      expect(existsSync(hookFile('ps1'))).toBe(false)
      expect(ctx.err()).toContain('unsupported encoding')
      expect(ctx.err()).toContain('nothing written')
    })

    it('refuses a UTF-16LE profile on --remove as well', async () => {
      mkdirSync(dirname(profile()), { recursive: true })
      const bytes = Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from('x', 'utf16le'),
      ])
      writeFileSync(profile(), bytes)

      const ctx = makeCtx({ runCommand: profileQuery() })
      expect(await setup(ctx, 'pwsh', { yes: true, remove: true }, deps)).toBe(
        1
      )

      expect(readFileSync(profile())).toEqual(bytes)
    })

    it('refuses a Latin-1 .bashrc and writes nothing', async () => {
      await sandbox.writeConfig({ profiles: [] })
      const bashrc = join(sandbox.home, '.bashrc')
      const bytes = Buffer.from([0x65, 0x63, 0x68, 0x6f, 0x20, 0xe9, 0x0a])
      writeFileSync(bashrc, bytes)

      const ctx = makeCtx()
      expect(await setup(ctx, 'bash', { yes: true }, deps)).toBe(1)

      expect(readFileSync(bashrc)).toEqual(bytes)
      expect(existsSync(hookFile('bash'))).toBe(false)
      expect(ctx.err()).toContain('unsupported encoding')
    })

    it('refuses a Latin-1 .bashrc on --remove as well', async () => {
      const bashrc = join(sandbox.home, '.bashrc')
      const bytes = Buffer.from([0xe9, 0x0a])
      writeFileSync(bashrc, bytes)

      const ctx = makeCtx()
      expect(await setup(ctx, 'bash', { yes: true, remove: true }, deps)).toBe(
        1
      )

      expect(readFileSync(bashrc)).toEqual(bytes)
    })
  })

  describe('PowerShell byte order mark', () => {
    it('gives a new profile a BOM when the hook path is non-ASCII', async () => {
      await sandbox.writeConfig({ profiles: [] })
      const configHome = join(sandbox.home, 'Jürgen Müller')
      const ctx = makeCtx({
        env: { XDG_CONFIG_HOME: configHome },
        runCommand: profileQuery(),
      })

      expect(await setup(ctx, 'powershell', { yes: true }, deps)).toBe(0)

      const bytes = readFileSync(profile())
      expect(bytes.subarray(0, 3)).toEqual(UTF8_BOM)
      expect(bytes.toString('utf8')).toContain(
        `. '${hookFile('ps1', configHome)}'`
      )
    })

    it('leaves an ASCII-only BOM-less profile without a BOM', async () => {
      await sandbox.writeConfig({ profiles: [] })
      mkdirSync(dirname(profile()), { recursive: true })
      writeFileSync(profile(), 'Set-Alias x y\r\n')
      // Existing file, ASCII hook path: no BOM is added. (The hook file is new
      // and gets one.)
      const ctx = makeCtx({ runCommand: profileQuery() })

      expect(await setup(ctx, 'pwsh', { yes: true }, deps)).toBe(0)

      const bytes = readFileSync(profile())
      expect(bytes.subarray(0, 3)).not.toEqual(UTF8_BOM)
      expect(bytes.toString('utf8')).toContain(MARKER.start)
    })

    it('keeps the BOM of an existing profile', async () => {
      await sandbox.writeConfig({ profiles: [] })
      mkdirSync(dirname(profile()), { recursive: true })
      writeFileSync(
        profile(),
        Buffer.concat([UTF8_BOM, Buffer.from('Set-Alias x y\r\n')])
      )

      expect(
        await setup(
          makeCtx({ runCommand: profileQuery() }),
          'pwsh',
          { yes: true },
          deps
        )
      ).toBe(0)

      expect(readFileSync(profile()).subarray(0, 3)).toEqual(UTF8_BOM)
    })
  })

  it('keeps a UTF-8 BOM on a bash rc file and is idempotent', async () => {
    await sandbox.writeConfig({ profiles: [] })
    const bashrc = join(sandbox.home, '.bashrc')
    writeFileSync(
      bashrc,
      Buffer.concat([UTF8_BOM, Buffer.from('export A=1\n')])
    )

    expect(await setup(makeCtx(), 'bash', { yes: true }, deps)).toBe(0)
    const first = readFileSync(bashrc)
    expect(first.subarray(0, 3)).toEqual(UTF8_BOM)
    expect(first.toString('utf8')).toContain(MARKER.start)

    const second = makeCtx()
    expect(await setup(second, 'bash', { yes: true }, deps)).toBe(0)
    expect(readFileSync(bashrc)).toEqual(first)
    expect(second.err()).toContain('unchanged')
  })

  it('writes nothing when the rc file changes while the question is open', async () => {
    await sandbox.writeConfig({ profiles: [] })
    const zshrc = join(sandbox.home, '.zshrc')
    writeFileSync(zshrc, 'export A=1\n')
    vi.mocked(confirm).mockImplementationOnce(() => {
      writeFileSync(zshrc, 'export B=2\n')
      return Promise.resolve(true)
    })

    const ctx = makeCtx({
      stdin: Object.assign(new PassThrough(), { isTTY: true }),
    })
    expect(await setup(ctx, 'zsh', {}, deps)).toBe(1)

    expect(readFileSync(zshrc, 'utf8')).toBe('export B=2\n')
    expect(existsSync(hookFile('zsh'))).toBe(false)
    expect(ctx.err()).toContain('changed while waiting')
  })

  it('calls init with { example: false } after the integration', async () => {
    const ctx = makeCtx()
    await setup(ctx, 'zsh', { yes: true }, deps)
    expect(runInit).toHaveBeenCalledWith(ctx, { example: false })
  })

  describe('profile query validation', () => {
    it.each([
      ['several lines', () => `${profile()}\nWARNING: noisy profile\n`],
      ['a relative path', () => 'Documents/profile.ps1\n'],
    ])('exits 1 and writes nothing for %s', async (_name, output) => {
      const ctx = makeCtx({ runCommand: answering(output()) })

      expect(await setup(ctx, 'pwsh', { yes: true }, deps)).toBe(1)

      expect(existsSync(profile())).toBe(false)
      expect(existsSync(hookFile('ps1'))).toBe(false)
      expect(ctx.err()).toContain('pwsh')
    })
  })
})
