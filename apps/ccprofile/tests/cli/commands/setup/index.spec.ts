import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import setup from '../../../../src/cli/commands/setup'
import type { ExitCode } from '../../../../src/constants'
import { MARKER, PROFILE_QUERY_TIMEOUT_MS } from '../../../../src/constants'
import type { Context, RunCommand } from '../../../../src/context/types'
import { readHook } from '../../../../src/hook'
import { confirm } from '../../../../src/prompt'
import createSandbox from '../../../helpers/createSandbox'

vi.mock('../../../../src/prompt')

type Sandbox = Awaited<ReturnType<typeof createSandbox>>

const read = (file: string): string => readFileSync(file, 'utf8')

describe('setup', () => {
  let sandbox: Sandbox
  let runInit: ReturnType<typeof vi.fn<() => Promise<ExitCode>>>
  let deps: { runInit: () => Promise<ExitCode> }

  beforeEach(async () => {
    sandbox = await createSandbox()
    runInit = vi.fn<() => Promise<ExitCode>>(() => Promise.resolve(0))
    deps = { runInit }
    vi.mocked(confirm).mockReset()
  })

  afterEach(async () => {
    await sandbox.cleanup()
  })

  // Everything points into the sandbox: HOME, ZDOTDIR, XDG_CONFIG_HOME, APPDATA.
  // `answer`: run in a terminal and answer the question with it.
  const makeCtx = (
    overrides: Partial<Context> & {
      answer?: boolean
      env?: Record<string, string>
    } = {}
  ) => {
    const { answer, env, ...rest } = overrides
    if (answer !== undefined) vi.mocked(confirm).mockResolvedValueOnce(answer)
    const base = sandbox.ctx(sandbox.home, {
      HOME: sandbox.home,
      ZDOTDIR: sandbox.home,
      XDG_CONFIG_HOME: join(sandbox.home, '.config'),
      APPDATA: join(sandbox.home, 'AppData', 'Roaming'),
      ...env,
    })
    return {
      ...base,
      platform: 'linux' as NodeJS.Platform,
      ...(answer !== undefined && {
        stdin: Object.assign(new PassThrough(), { isTTY: true }),
      }),
      ...rest,
    }
  }

  const zshrc = () => join(sandbox.home, '.zshrc')
  const hookFile = (ext: string) =>
    join(sandbox.home, '.config', 'ccprofile', `hook.${ext}`)
  const configFile = () =>
    join(sandbox.home, '.config', 'ccprofile', 'config.json')
  const withConfig = () => sandbox.writeConfig({ profiles: [] })

  it('installs the hook file and a block into .zshrc, then is idempotent', async () => {
    await withConfig()
    writeFileSync(zshrc(), 'export A=1\n')

    const ctx = makeCtx()
    expect(await setup(ctx, 'zsh', { yes: true }, deps)).toBe(0)

    expect(read(hookFile('zsh'))).toBe(await readHook('zsh'))
    expect(read(zshrc())).toBe(
      [
        'export A=1',
        '',
        MARKER.start,
        `source '${hookFile('zsh')}'`,
        MARKER.end,
        '',
      ].join('\n')
    )
    expect(runInit).not.toHaveBeenCalled()

    const after = read(zshrc())
    const second = makeCtx()
    expect(await setup(second, 'zsh', { yes: true }, deps)).toBe(0)
    expect(read(zshrc())).toBe(after)
    expect(second.err()).toContain('unchanged')
  })

  it('prints the diff and the question, and writes after y', async () => {
    await withConfig()
    writeFileSync(zshrc(), 'export A=1\n')

    const ctx = makeCtx({ answer: true })
    expect(await setup(ctx, 'zsh', {}, deps)).toBe(0)

    expect(ctx.err()).toContain(`+${MARKER.start}`)
    expect(ctx.err()).toContain(`+source '${hookFile('zsh')}'`)
    expect(confirm).toHaveBeenCalledWith('Apply these changes?', ctx)
    expect(read(zshrc())).toContain(MARKER.start)
    expect(existsSync(hookFile('zsh'))).toBe(true)
  })

  it('writes nothing and exits 1 after n', async () => {
    await withConfig()
    writeFileSync(zshrc(), 'export A=1\n')

    const ctx = makeCtx({ answer: false })
    expect(await setup(ctx, 'zsh', {}, deps)).toBe(1)

    expect(read(zshrc())).toBe('export A=1\n')
    expect(existsSync(hookFile('zsh'))).toBe(false)
    expect(runInit).not.toHaveBeenCalled()
  })

  it('needs --yes without a terminal', async () => {
    await withConfig()
    const ctx = makeCtx()
    expect(await setup(ctx, 'zsh', {}, deps)).toBe(1)
    expect(existsSync(zshrc())).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
    expect(ctx.err()).toContain('pass --yes')
  })

  it('creates a missing .zshrc', async () => {
    await withConfig()
    expect(await setup(makeCtx(), 'zsh', { yes: true }, deps)).toBe(0)
    expect(read(zshrc())).toBe(
      `${MARKER.start}\nsource '${hookFile('zsh')}'\n${MARKER.end}\n`
    )
  })

  it('--remove deletes the block and the hook file and never the config', async () => {
    await withConfig()
    writeFileSync(zshrc(), 'export A=1\n')
    await setup(makeCtx(), 'zsh', { yes: true }, deps)
    const configBefore = read(configFile())

    const ctx = makeCtx()
    expect(await setup(ctx, 'zsh', { yes: true, remove: true }, deps)).toBe(0)

    expect(read(zshrc())).toBe('export A=1\n\n')
    expect(read(zshrc())).not.toContain(MARKER.start)
    expect(existsSync(hookFile('zsh'))).toBe(false)
    expect(read(configFile())).toBe(configBefore)
    expect(runInit).not.toHaveBeenCalled()
  })

  describe('a hook file that is not UTF-8', () => {
    const UTF16LE_BOM = Buffer.from([0xff, 0xfe])

    const writeUtf16Hook = () => {
      mkdirSync(dirname(hookFile('zsh')), { recursive: true })
      writeFileSync(
        hookFile('zsh'),
        Buffer.concat([UTF16LE_BOM, Buffer.from('# old hook\n', 'utf16le')])
      )
    }

    it('is overwritten by setup', async () => {
      await withConfig()
      writeUtf16Hook()

      const ctx = makeCtx()
      expect(await setup(ctx, 'zsh', { yes: true }, deps)).toBe(0)

      expect(read(hookFile('zsh'))).toBe(await readHook('zsh'))
      expect(read(zshrc())).toContain(MARKER.start)
    })

    it('is removed by --remove', async () => {
      await withConfig()
      await setup(makeCtx(), 'zsh', { yes: true }, deps)
      writeUtf16Hook()

      expect(
        await setup(makeCtx(), 'zsh', { yes: true, remove: true }, deps)
      ).toBe(0)

      expect(existsSync(hookFile('zsh'))).toBe(false)
      expect(read(zshrc())).not.toContain(MARKER.start)
    })

    it('is overwritten as the fish conf.d file', async () => {
      await withConfig()
      const target = join(
        sandbox.home,
        '.config',
        'fish',
        'conf.d',
        'ccprofile.fish'
      )
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(
        target,
        Buffer.concat([UTF16LE_BOM, Buffer.from('# old\n', 'utf16le')])
      )

      expect(await setup(makeCtx(), 'fish', { yes: true }, deps)).toBe(0)

      expect(read(target)).toBe(await readHook('fish'))
    })
  })

  it('--remove with nothing installed reports unchanged and exits 0', async () => {
    const ctx = makeCtx()
    expect(await setup(ctx, 'zsh', { yes: true, remove: true }, deps)).toBe(0)
    expect(ctx.err()).toContain('unchanged')
    expect(runInit).not.toHaveBeenCalled()
  })

  it('honours ZDOTDIR', async () => {
    await withConfig()
    const zdot = join(sandbox.home, 'zdot')
    mkdirSync(zdot)
    const ctx = makeCtx({ env: { ZDOTDIR: zdot } })

    expect(await setup(ctx, 'zsh', { yes: true }, deps)).toBe(0)

    expect(read(join(zdot, '.zshrc'))).toContain(MARKER.start)
    expect(existsSync(zshrc())).toBe(false)
  })

  it('installs bash into .bashrc', async () => {
    await withConfig()
    expect(await setup(makeCtx(), 'bash', { yes: true }, deps)).toBe(0)
    expect(read(join(sandbox.home, '.bashrc'))).toContain(
      `source '${hookFile('bash')}'`
    )
  })

  it('quotes a hook path with spaces and non-ASCII characters', async () => {
    await withConfig()
    const config = join(sandbox.home, 'Jürgen Müller', 'cfg')
    const ctx = makeCtx({ env: { XDG_CONFIG_HOME: config } })

    expect(await setup(ctx, 'zsh', { yes: true }, deps)).toBe(0)

    const file = join(config, 'ccprofile', 'hook.zsh')
    expect(existsSync(file)).toBe(true)
    expect(read(zshrc())).toContain(`source '${file}'`)
  })

  it('makes the conf.d file the hook for fish and touches no rc file', async () => {
    await withConfig()
    const target = join(
      sandbox.home,
      '.config',
      'fish',
      'conf.d',
      'ccprofile.fish'
    )

    expect(await setup(makeCtx(), 'fish', { yes: true }, deps)).toBe(0)

    expect(read(target)).toBe(await readHook('fish'))
    expect(existsSync(hookFile('fish'))).toBe(false)
    expect(existsSync(zshrc())).toBe(false)
    expect(existsSync(join(sandbox.home, '.bashrc'))).toBe(false)

    const second = makeCtx()
    expect(await setup(second, 'fish', { yes: true }, deps)).toBe(0)
    expect(second.err()).toContain('unchanged')

    expect(
      await setup(makeCtx(), 'fish', { yes: true, remove: true }, deps)
    ).toBe(0)
    expect(existsSync(target)).toBe(false)
  })

  it('aborts on a malformed .zshrc and writes nothing', async () => {
    await withConfig()
    const broken = `${MARKER.start}\nsource x\n`
    writeFileSync(zshrc(), broken)

    const ctx = makeCtx()
    expect(await setup(ctx, 'zsh', { yes: true }, deps)).toBe(1)

    expect(read(zshrc())).toBe(broken)
    expect(existsSync(hookFile('zsh'))).toBe(false)
    expect(ctx.err()).toContain(zshrc())
  })

  it('aborts --remove on a malformed .zshrc and keeps the hook file', async () => {
    await withConfig()
    await setup(makeCtx(), 'zsh', { yes: true }, deps)
    const doubled = `${read(zshrc())}${read(zshrc())}`
    writeFileSync(zshrc(), doubled)

    expect(
      await setup(makeCtx(), 'zsh', { yes: true, remove: true }, deps)
    ).toBe(1)

    expect(read(zshrc())).toBe(doubled)
    expect(existsSync(hookFile('zsh'))).toBe(true)
  })

  it('requires the shell argument on Windows', async () => {
    const ctx = makeCtx({ platform: 'win32' })
    expect(await setup(ctx, undefined, { yes: true }, deps)).toBe(1)
    expect(ctx.err()).toContain('shell argument required on Windows')
  })

  it('detects the shell from SHELL elsewhere', async () => {
    await withConfig()
    const ctx = makeCtx({ env: { SHELL: '/bin/zsh' } })
    expect(await setup(ctx, undefined, { yes: true }, deps)).toBe(0)
    expect(read(zshrc())).toContain(MARKER.start)
  })

  it('fails when the shell cannot be detected', async () => {
    const ctx = makeCtx({ env: { SHELL: '/bin/sh' } })
    expect(await setup(ctx, undefined, { yes: true }, deps)).toBe(1)
    expect(ctx.err()).toContain('shell')
  })

  it('rejects an unknown shell argument', async () => {
    const ctx = makeCtx()
    expect(await setup(ctx, 'cmd', { yes: true }, deps)).toBe(1)
    expect(ctx.err()).toContain('unknown shell "cmd"')
  })

  describe('PowerShell', () => {
    const profile = () => join(sandbox.home, 'Documents', 'profile.ps1')

    const recording = () =>
      vi.fn<RunCommand>(() => {
        mkdirSync(dirname(profile()), { recursive: true })
        return Promise.resolve({
          exitCode: 0,
          stdout: `${profile()}\r\n`,
          stderr: '',
          timedOut: false,
          notFound: false,
        })
      })

    it.each([
      [
        'powershell',
        'powershell.exe',
        { env: { PSModulePath: '' }, timeoutMs: PROFILE_QUERY_TIMEOUT_MS },
      ],
      ['pwsh', 'pwsh', { timeoutMs: PROFILE_QUERY_TIMEOUT_MS }],
    ] as const)('queries %s through %s', async (shell, exe, options) => {
      await withConfig()
      const runCommand = recording()
      // posix path rules: a win32 ctx on a posix host would write to
      // backslash-named files in the working directory.
      const ctx = makeCtx({ runCommand })

      expect(await setup(ctx, shell, { yes: true }, deps)).toBe(0)

      expect(runCommand).toHaveBeenCalledTimes(1)
      const [file, , passed] = runCommand.mock.calls[0] ?? []
      expect(file).toBe(exe)
      expect(passed).toEqual(options)
      expect(read(profile())).toContain(MARKER.start)
      expect(read(profile())).toContain('. ')
    })

    describe('shared hook.ps1', () => {
      const profiles = {
        pwsh: () =>
          join(sandbox.home, 'Documents', 'PowerShell', 'profile.ps1'),
        'powershell.exe': () =>
          join(sandbox.home, 'Documents', 'WindowsPowerShell', 'profile.ps1'),
      } as const

      // Answers each PowerShell's profile query; a name missing from
      // `installed` behaves like an executable that is not on PATH.
      const twoPowerShells = (installed: readonly string[]) =>
        vi.fn<RunCommand>(file => {
          if (!installed.includes(file) || !(file in profiles)) {
            return Promise.resolve({
              exitCode: null,
              stdout: '',
              stderr: '',
              timedOut: false,
              notFound: true,
            })
          }
          const target = profiles[file as keyof typeof profiles]()
          mkdirSync(dirname(target), { recursive: true })
          return Promise.resolve({
            exitCode: 0,
            stdout: `${target}\r\n`,
            stderr: '',
            timedOut: false,
            notFound: false,
          })
        })

      const both = ['pwsh', 'powershell.exe']

      it.each([
        ['pwsh', 'powershell', 'powershell.exe', 'pwsh'],
        ['powershell', 'pwsh', 'pwsh', 'powershell.exe'],
      ] as const)(
        'keeps hook.ps1 when removing %s while %s still uses it, then removes it with the second',
        async (first, second, otherExe, firstExe) => {
          await withConfig()
          const runCommand = twoPowerShells(both)
          expect(
            await setup(makeCtx({ runCommand }), first, { yes: true }, deps)
          ).toBe(0)
          expect(
            await setup(makeCtx({ runCommand }), second, { yes: true }, deps)
          ).toBe(0)

          const ctx = makeCtx({ runCommand })
          expect(
            await setup(ctx, first, { yes: true, remove: true }, deps)
          ).toBe(0)

          expect(read(profiles[firstExe]())).not.toContain(MARKER.start)
          expect(read(profiles[otherExe]())).toContain(MARKER.start)
          expect(existsSync(hookFile('ps1'))).toBe(true)
          expect(ctx.err()).toContain(
            `kept ${hookFile('ps1')} – still used by ${second} profile`
          )

          const last = makeCtx({ runCommand })
          expect(
            await setup(last, second, { yes: true, remove: true }, deps)
          ).toBe(0)

          expect(read(profiles[otherExe]())).not.toContain(MARKER.start)
          expect(existsSync(hookFile('ps1'))).toBe(false)
          expect(last.err()).not.toContain('kept')
        }
      )

      it('removes hook.ps1 when the other PowerShell is not installed', async () => {
        await withConfig()
        const runCommand = twoPowerShells(['pwsh'])
        expect(
          await setup(makeCtx({ runCommand }), 'pwsh', { yes: true }, deps)
        ).toBe(0)

        const ctx = makeCtx({ runCommand })
        expect(
          await setup(ctx, 'pwsh', { yes: true, remove: true }, deps)
        ).toBe(0)

        expect(read(profiles.pwsh())).not.toContain(MARKER.start)
        expect(existsSync(hookFile('ps1'))).toBe(false)
        expect(runCommand.mock.calls.map(([file]) => file)).toContain(
          'powershell.exe'
        )
      })

      it('removes hook.ps1 when the other profile has no ccprofile block', async () => {
        await withConfig()
        const runCommand = twoPowerShells(both)
        expect(
          await setup(makeCtx({ runCommand }), 'pwsh', { yes: true }, deps)
        ).toBe(0)
        mkdirSync(dirname(profiles['powershell.exe']()), { recursive: true })
        writeFileSync(profiles['powershell.exe'](), 'Set-Alias x y\r\n')

        expect(
          await setup(
            makeCtx({ runCommand }),
            'pwsh',
            { yes: true, remove: true },
            deps
          )
        ).toBe(0)

        expect(existsSync(hookFile('ps1'))).toBe(false)
        expect(read(profiles['powershell.exe']())).toBe('Set-Alias x y\r\n')
      })
    })

    it('exits 1 and writes nothing when the query returns nothing', async () => {
      const runCommand = vi.fn<RunCommand>(() =>
        Promise.resolve({
          exitCode: 0,
          stdout: '\n',
          stderr: '',
          timedOut: false,
          notFound: false,
        })
      )
      const ctx = makeCtx({ runCommand })

      expect(await setup(ctx, 'pwsh', { yes: true }, deps)).toBe(1)

      expect(existsSync(profile())).toBe(false)
      expect(ctx.err()).toContain('pwsh')
    })
  })

  describe('bash warning', () => {
    it('warns on darwin when .bash_profile does not source .bashrc', async () => {
      await withConfig()
      writeFileSync(join(sandbox.home, '.bash_profile'), 'export A=1\n')
      const ctx = makeCtx({ platform: 'darwin' })

      expect(await setup(ctx, 'bash', { yes: true }, deps)).toBe(0)

      expect(ctx.err()).toContain('.bash_profile')
    })

    it('does not warn on linux without a .bash_profile', async () => {
      await withConfig()
      const ctx = makeCtx({ platform: 'linux' })

      expect(await setup(ctx, 'bash', { yes: true }, deps)).toBe(0)

      expect(ctx.err()).not.toContain('.bash_profile')
    })
  })

  describe('init', () => {
    it('runs init after writing when there is no config', async () => {
      runInit.mockImplementation(() => {
        expect(existsSync(hookFile('zsh'))).toBe(true)
        return Promise.resolve(0)
      })

      expect(await setup(makeCtx(), 'zsh', { yes: true }, deps)).toBe(0)

      expect(runInit).toHaveBeenCalledTimes(1)
    })

    it('returns the exit code of init', async () => {
      runInit.mockResolvedValue(1)
      expect(await setup(makeCtx(), 'zsh', { yes: true }, deps)).toBe(1)
      expect(existsSync(hookFile('zsh'))).toBe(true)
    })

    it('runs init even when the integration was already in place', async () => {
      await setup(makeCtx(), 'zsh', { yes: true }, deps)
      runInit.mockClear()

      await setup(makeCtx(), 'zsh', { yes: true }, deps)

      expect(runInit).toHaveBeenCalledTimes(1)
    })

    it('does not run init when a config exists', async () => {
      await withConfig()
      await setup(makeCtx(), 'zsh', { yes: true }, deps)
      expect(runInit).not.toHaveBeenCalled()
    })

    it('ends with the hint of the real init in a non-TTY without a config', async () => {
      const { runInit: realRunInit } = await import('../../../../src/init')
      const ctx = makeCtx()

      const code = await setup(
        ctx,
        'zsh',
        { yes: true },
        { runInit: realRunInit }
      )

      expect(code).toBe(1)
      expect(ctx.err()).toContain('ccprofile init --example')
      expect(existsSync(hookFile('zsh'))).toBe(true)
    })
  })
})
