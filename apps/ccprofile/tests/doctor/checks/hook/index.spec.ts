import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MARKER } from '../../../../src/constants'
import type { RunCommand } from '../../../../src/context/types'
import checkHook from '../../../../src/doctor/checks/hook'
import { readHook } from '../../../../src/hook'
import createSandbox from '../../../helpers/createSandbox'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>

describe('checkHook', () => {
  let sandbox: Sandbox

  beforeEach(async () => {
    sandbox = await createSandbox()
  })

  afterEach(async () => {
    await sandbox.cleanup()
  })

  // Everything points into the sandbox: HOME, ZDOTDIR, XDG_CONFIG_HOME, APPDATA.
  const makeCtx = (
    env: Record<string, string> = {},
    runCommand?: RunCommand
  ) => {
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
      ...(runCommand !== undefined && { runCommand }),
    }
  }

  const hookFile = (ext: string) =>
    join(sandbox.home, '.config', 'ccprofile', `hook.${ext}`)
  const write = (file: string, content: string | Buffer) => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
  }
  const block = (file: string) =>
    [MARKER.start, `source '${file}'`, MARKER.end, ''].join('\n')
  const installZsh = async (hookText?: string) => {
    write(hookFile('zsh'), hookText ?? (await readHook('zsh')))
    write(
      join(sandbox.home, '.zshrc'),
      `export A=1\n\n${block(hookFile('zsh'))}`
    )
  }

  const statuses = (results: { status: string }[]) =>
    results.map(result => result.status)

  it('is ok for a current hook file and a block in .zshrc', async () => {
    await installZsh()

    const results = await checkHook(makeCtx({ SHELL: '/bin/zsh' }), null)

    expect(statuses(results)).toEqual(['ok', 'ok'])
  })

  it('warns about an outdated hook file and says to run setup', async () => {
    await installZsh('# ccprofile hook v0\n')

    const results = await checkHook(makeCtx({ SHELL: '/bin/zsh' }), null)
    const outdated = results.find(result => result.status === 'warn')

    expect(outdated?.message).toContain('outdated')
    expect(outdated?.message).toContain('run ccprofile setup')
  })

  it('warns when the hook file has no version marker at all', async () => {
    await installZsh('echo hi\n')

    const results = await checkHook(makeCtx({ SHELL: '/bin/zsh' }), null)

    expect(results.some(result => result.status === 'warn')).toBe(true)
  })

  it('warns when .zshrc has no ccprofile block', async () => {
    write(hookFile('zsh'), await readHook('zsh'))
    write(join(sandbox.home, '.zshrc'), 'export A=1\n')

    const results = await checkHook(makeCtx({ SHELL: '/bin/zsh' }), null)
    const missing = results.find(result => result.status === 'warn')

    expect(missing?.message).toContain('.zshrc')
    expect(missing?.message).toContain('run ccprofile setup')
  })

  it('warns when the block points to another hook file', async () => {
    write(hookFile('zsh'), await readHook('zsh'))
    write(
      join(sandbox.home, '.zshrc'),
      block(join(sandbox.home, 'elsewhere', 'hook.zsh'))
    )

    const results = await checkHook(makeCtx({ SHELL: '/bin/zsh' }), null)

    expect(statuses(results)).toContain('warn')
  })

  it('warns about a hook file that is missing for the detected shell', async () => {
    write(join(sandbox.home, '.zshrc'), block(hookFile('zsh')))

    const results = await checkHook(makeCtx({ SHELL: '/bin/zsh' }), null)

    expect(statuses(results)).toContain('warn')
  })

  it('warns, and does not crash, for a startup file that is not UTF-8', async () => {
    write(hookFile('zsh'), await readHook('zsh'))
    write(join(sandbox.home, '.zshrc'), Buffer.from([0x66, 0xff, 0xfe, 0x0a]))

    const results = await checkHook(makeCtx({ SHELL: '/bin/zsh' }), null)

    expect(statuses(results)).toContain('warn')
    expect(results.map(result => result.message).join('\n')).toContain('UTF-8')
  })

  it('warns about a malformed block', async () => {
    write(hookFile('zsh'), await readHook('zsh'))
    write(join(sandbox.home, '.zshrc'), `${MARKER.start}\n`)

    const results = await checkHook(makeCtx({ SHELL: '/bin/zsh' }), null)

    expect(statuses(results)).toContain('warn')
  })

  it('checks bash too when its hook file exists, whatever $SHELL says', async () => {
    await installZsh()
    write(hookFile('bash'), await readHook('bash'))
    write(join(sandbox.home, '.bashrc'), `${block(hookFile('bash'))}`)

    const results = await checkHook(makeCtx({ SHELL: '/bin/zsh' }), null)

    expect(statuses(results)).toEqual(['ok', 'ok', 'ok', 'ok'])
  })

  it('checks the fish conf.d file against the current version', async () => {
    write(
      join(sandbox.home, '.config', 'fish', 'conf.d', 'ccprofile.fish'),
      await readHook('fish')
    )

    const results = await checkHook(makeCtx({ SHELL: '/usr/bin/fish' }), null)

    expect(statuses(results)).toEqual(['ok'])
  })

  it('warns about an outdated fish conf.d file', async () => {
    write(
      join(sandbox.home, '.config', 'fish', 'conf.d', 'ccprofile.fish'),
      '# ccprofile hook v0\n'
    )

    const results = await checkHook(makeCtx({ SHELL: '/usr/bin/fish' }), null)

    expect(results[0]?.status).toBe('warn')
    expect(results[0]?.message).toContain('run ccprofile setup')
  })

  it('queries pwsh and powershell.exe and checks each profile that exists', async () => {
    write(hookFile('ps1'), await readHook('pwsh'))
    const pwshProfile = join(sandbox.home, 'pwsh', 'profile.ps1')
    const winProfile = join(sandbox.home, 'win', 'profile.ps1')
    write(
      pwshProfile,
      `${[MARKER.start, `. '${hookFile('ps1')}'`, MARKER.end].join('\n')}\n`
    )
    write(winProfile, '# nothing here\n')
    const calls: string[] = []
    const runCommand: RunCommand = file => {
      calls.push(file)
      return Promise.resolve({
        exitCode: 0,
        stdout: `${file === 'pwsh' ? pwshProfile : winProfile}\n`,
        stderr: '',
        timedOut: false,
        notFound: false,
      })
    }

    const results = await checkHook(makeCtx({}, runCommand), null)

    expect(calls.sort()).toEqual(['powershell.exe', 'pwsh'])
    expect(results.filter(result => result.status === 'warn')).toHaveLength(1)
    expect(results.find(result => result.status === 'warn')?.message).toContain(
      winProfile
    )
    expect(
      results.some(
        result => result.status === 'ok' && result.message.includes(pwshProfile)
      )
    ).toBe(true)
  })

  it('skips a PowerShell that is not installed or has no profile file', async () => {
    write(hookFile('ps1'), await readHook('pwsh'))
    const runCommand: RunCommand = () =>
      Promise.resolve({
        exitCode: null,
        stdout: '',
        stderr: '',
        timedOut: false,
        notFound: true,
      })

    const results = await checkHook(makeCtx({}, runCommand), null)

    expect(statuses(results)).toEqual(['ok'])
  })

  it('warns that no hook is installed when no shell is in scope', async () => {
    const results = await checkHook(makeCtx(), null)

    expect(statuses(results)).toEqual(['warn'])
    expect(results[0]?.message).toContain('run ccprofile setup')
  })
})
