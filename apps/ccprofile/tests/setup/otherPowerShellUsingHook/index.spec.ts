import { describe, expect, it, vi } from 'vitest'

import { PROFILE_QUERY_TIMEOUT_MS } from '../../../src/constants'
import type { RunCommand } from '../../../src/context/types'
import otherPowerShellUsingHook from '../../../src/setup/otherPowerShellUsingHook'
import createTestContext from '../../helpers/createTestContext'

describe('otherPowerShellUsingHook', () => {
  it('treats a PowerShell that does not answer in time as not using the hook', async () => {
    const runCommand = vi.fn<RunCommand>(() =>
      Promise.resolve({
        exitCode: null,
        stdout: '',
        stderr: '',
        timedOut: true,
        notFound: false,
      })
    )
    const ctx = createTestContext({ platform: 'win32', runCommand })

    expect(
      await otherPowerShellUsingHook('pwsh', 'C:\\a\\profile.ps1', ctx)
    ).toBeNull()
    expect(runCommand).toHaveBeenCalledWith(
      'powershell.exe',
      expect.any(Array),
      expect.objectContaining({ timeoutMs: PROFILE_QUERY_TIMEOUT_MS })
    )
  })
})
