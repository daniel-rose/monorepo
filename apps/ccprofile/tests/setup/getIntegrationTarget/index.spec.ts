import { describe, expect, it, vi } from 'vitest'

import type { RunCommand } from '../../../src/context/types'
import getIntegrationTarget from '../../../src/setup/getIntegrationTarget'
import createTestContext from '../../helpers/createTestContext'

const QUERY =
  '[Console]::OutputEncoding=[Text.Encoding]::UTF8; $PROFILE.CurrentUserAllHosts'

const answering = (stdout: string, exitCode: number | null = 0) =>
  vi.fn<RunCommand>(() =>
    Promise.resolve({
      exitCode,
      stdout,
      stderr: '',
      timedOut: false,
      notFound: false,
    })
  )

describe('getIntegrationTarget', () => {
  it('uses ~/.zshrc for zsh', async () => {
    const ctx = createTestContext({ homedir: '/home/jane' })
    expect(await getIntegrationTarget('zsh', ctx)).toEqual({
      kind: 'block',
      file: '/home/jane/.zshrc',
    })
  })

  it('honours ZDOTDIR for zsh', async () => {
    const ctx = createTestContext({
      homedir: '/home/jane',
      env: { ZDOTDIR: '/home/jane/zdot' },
    })
    expect(await getIntegrationTarget('zsh', ctx)).toEqual({
      kind: 'block',
      file: '/home/jane/zdot/.zshrc',
    })
  })

  it('uses ~/.bashrc for bash', async () => {
    const ctx = createTestContext({ homedir: '/home/jane' })
    expect(await getIntegrationTarget('bash', ctx)).toEqual({
      kind: 'block',
      file: '/home/jane/.bashrc',
    })
  })

  it('uses the conf.d file for fish', async () => {
    const ctx = createTestContext({ homedir: '/home/jane' })
    expect(await getIntegrationTarget('fish', ctx)).toEqual({
      kind: 'file',
      file: '/home/jane/.config/fish/conf.d/ccprofile.fish',
    })
  })

  it('asks pwsh for its profile, without an env override', async () => {
    const runCommand = answering('C:\\Users\\jane\\Documents\\profile.ps1\r\n')
    const ctx = createTestContext({ platform: 'win32', runCommand })

    expect(await getIntegrationTarget('pwsh', ctx)).toEqual({
      kind: 'block',
      file: 'C:\\Users\\jane\\Documents\\profile.ps1',
    })
    expect(runCommand).toHaveBeenCalledTimes(1)
    expect(runCommand).toHaveBeenCalledWith('pwsh', [
      '-NoProfile',
      '-Command',
      QUERY,
    ])
  })

  it('asks powershell.exe with an empty PSModulePath', async () => {
    const runCommand = answering('\uFEFFC:\\Users\\jürgen\\profile.ps1\n')
    const ctx = createTestContext({ platform: 'win32', runCommand })

    expect(await getIntegrationTarget('powershell', ctx)).toEqual({
      kind: 'block',
      file: 'C:\\Users\\jürgen\\profile.ps1',
    })
    expect(runCommand).toHaveBeenCalledWith(
      'powershell.exe',
      ['-NoProfile', '-Command', QUERY],
      { env: { PSModulePath: '' } }
    )
  })

  it.each([
    ['several lines', answering('C:\\a\\profile.ps1\nnoise\n')],
    ['a relative path', answering('Documents\\profile.ps1\n')],
  ])('rejects %s from the profile query', async (_name, runCommand) => {
    const ctx = createTestContext({ platform: 'win32', runCommand })
    await expect(getIntegrationTarget('pwsh', ctx)).rejects.toThrow(
      /single absolute profile path/
    )
  })

  it.each([
    ['empty output', answering('  \n')],
    ['a non-zero exit', answering('x', 1)],
    ['a missing executable', answering('', null)],
  ])('throws on %s', async (_name, runCommand) => {
    const ctx = createTestContext({ platform: 'win32', runCommand })
    await expect(getIntegrationTarget('pwsh', ctx)).rejects.toThrow(/pwsh/)
  })
})
