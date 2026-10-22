import { describe, expect, it } from 'vitest'

import hookFilePath from '../../../src/setup/hookFilePath'
import createTestContext from '../../helpers/createTestContext'

describe('hookFilePath', () => {
  it('lives in the XDG config home on posix', () => {
    const ctx = createTestContext({
      homedir: '/home/jane',
      env: { XDG_CONFIG_HOME: '/xdg' },
    })
    expect(hookFilePath('zsh', ctx)).toBe('/xdg/ccprofile/hook.zsh')
  })

  it('falls back to ~/.config', () => {
    const ctx = createTestContext({ homedir: '/home/jane' })
    expect(hookFilePath('bash', ctx)).toBe(
      '/home/jane/.config/ccprofile/hook.bash'
    )
  })

  it('ignores the CCPROFILE_CONFIG override, which points at a file', () => {
    const ctx = createTestContext({
      homedir: '/home/jane',
      env: { CCPROFILE_CONFIG: '/elsewhere/my.json' },
    })
    expect(hookFilePath('zsh', ctx)).toBe(
      '/home/jane/.config/ccprofile/hook.zsh'
    )
  })

  it.each(['pwsh', 'powershell'] as const)(
    'uses APPDATA and the ps1 extension on Windows for %s',
    shell => {
      const ctx = createTestContext({
        platform: 'win32',
        homedir: 'C:\\Users\\jane',
        env: { APPDATA: 'C:\\Roaming' },
      })
      expect(hookFilePath(shell, ctx)).toBe('C:\\Roaming\\ccprofile\\hook.ps1')
    }
  )

  it('falls back to <home>\\AppData\\Roaming on Windows', () => {
    const ctx = createTestContext({
      platform: 'win32',
      homedir: 'C:\\Users\\jane',
    })
    expect(hookFilePath('pwsh', ctx)).toBe(
      'C:\\Users\\jane\\AppData\\Roaming\\ccprofile\\hook.ps1'
    )
  })
})
