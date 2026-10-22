import { describe, expect, it } from 'vitest'

import locateConfigHome from '../../../src/config/locateConfigHome'
import createTestContext from '../../helpers/createTestContext'

describe('locateConfigHome', () => {
  it('prefers XDG_CONFIG_HOME on posix', () => {
    const ctx = createTestContext({ env: { XDG_CONFIG_HOME: '/xdg' } })
    expect(locateConfigHome(ctx)).toBe('/xdg')
  })

  it('treats an empty XDG_CONFIG_HOME as unset', () => {
    const ctx = createTestContext({
      homedir: '/home/jane',
      env: { XDG_CONFIG_HOME: '' },
    })
    expect(locateConfigHome(ctx)).toBe('/home/jane/.config')
  })

  it('uses APPDATA on Windows', () => {
    const ctx = createTestContext({
      platform: 'win32',
      env: { APPDATA: 'C:\\Roaming' },
    })
    expect(locateConfigHome(ctx)).toBe('C:\\Roaming')
  })
})
