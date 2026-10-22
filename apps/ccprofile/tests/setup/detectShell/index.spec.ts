import { describe, expect, it } from 'vitest'

import detectShell from '../../../src/setup/detectShell'
import createTestContext from '../../helpers/createTestContext'

describe('detectShell', () => {
  it.each([
    ['/bin/zsh', 'zsh'],
    ['/usr/local/bin/bash', 'bash'],
    ['/opt/homebrew/bin/fish', 'fish'],
    ['/usr/bin/pwsh', 'pwsh'],
  ])('maps SHELL=%s to %s', (value, expected) => {
    const ctx = createTestContext({ env: { SHELL: value } })
    expect(detectShell(ctx)).toBe(expected)
  })

  it.each(['/bin/sh', '/usr/bin/tcsh', '', undefined])(
    'returns null for SHELL=%s',
    value => {
      const ctx = createTestContext({ env: { SHELL: value } })
      expect(detectShell(ctx)).toBeNull()
    }
  )

  it('returns null on Windows even if SHELL is set', () => {
    const ctx = createTestContext({
      platform: 'win32',
      env: { SHELL: '/usr/bin/bash' },
    })
    expect(detectShell(ctx)).toBeNull()
  })
})
