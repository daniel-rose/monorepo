import { describe, expect, it } from 'vitest'

import locateConfig from '../../../src/config/locateConfig'
import createTestContext from '../../helpers/createTestContext'

describe('locateConfig', () => {
  it('defaults to ~/.config/ccprofile/config.json', () => {
    expect(locateConfig(createTestContext())).toBe(
      '/home/jane/.config/ccprofile/config.json'
    )
  })

  it('honours XDG_CONFIG_HOME', () => {
    const ctx = createTestContext({ env: { XDG_CONFIG_HOME: '/xdg' } })
    expect(locateConfig(ctx)).toBe('/xdg/ccprofile/config.json')
  })

  it('treats an empty XDG_CONFIG_HOME as unset', () => {
    const ctx = createTestContext({ env: { XDG_CONFIG_HOME: '' } })
    expect(locateConfig(ctx)).toBe('/home/jane/.config/ccprofile/config.json')
  })

  it('lets CCPROFILE_CONFIG override everything', () => {
    const ctx = createTestContext({
      env: { CCPROFILE_CONFIG: '/etc/cc.json', XDG_CONFIG_HOME: '/xdg' },
    })
    expect(locateConfig(ctx)).toBe('/etc/cc.json')
  })

  it('ignores an empty CCPROFILE_CONFIG', () => {
    const ctx = createTestContext({
      env: { CCPROFILE_CONFIG: '', XDG_CONFIG_HOME: '/xdg' },
    })
    expect(locateConfig(ctx)).toBe('/xdg/ccprofile/config.json')
  })

  it('uses APPDATA on win32', () => {
    const ctx = createTestContext({
      platform: 'win32',
      homedir: 'C:\\Users\\jane',
      env: { APPDATA: 'D:\\Roaming', XDG_CONFIG_HOME: '/xdg' },
    })
    expect(locateConfig(ctx)).toBe('D:\\Roaming\\ccprofile\\config.json')
  })

  it('falls back to <homedir>\\AppData\\Roaming on win32 without APPDATA', () => {
    const ctx = createTestContext({
      platform: 'win32',
      homedir: 'C:\\Users\\jane',
      env: { APPDATA: '' },
    })
    expect(locateConfig(ctx)).toBe(
      'C:\\Users\\jane\\AppData\\Roaming\\ccprofile\\config.json'
    )
  })
})
