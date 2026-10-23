import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import setup from '../../../../src/cli/commands/setup'
import type { RunCommand } from '../../../../src/context/types'
import createSandbox from '../../../helpers/createSandbox'

describe('setup when PowerShell does not answer', () => {
  let sandbox: Awaited<ReturnType<typeof createSandbox>>

  beforeEach(async () => {
    sandbox = await createSandbox()
  })

  afterEach(async () => {
    await sandbox.cleanup()
  })

  it('fails in time and writes nothing', async () => {
    await sandbox.writeConfig({ profiles: [] })
    const runCommand = vi.fn<RunCommand>(() =>
      Promise.resolve({
        exitCode: null,
        stdout: '',
        stderr: '',
        timedOut: true,
        notFound: false,
      })
    )
    const ctx = {
      ...sandbox.ctx(sandbox.home, {
        HOME: sandbox.home,
        XDG_CONFIG_HOME: join(sandbox.home, '.config'),
      }),
      platform: 'linux' as NodeJS.Platform,
      runCommand,
    }

    const code = await setup(
      ctx,
      'pwsh',
      { yes: true },
      {
        runInit: () => Promise.resolve(0),
      }
    )

    expect(code).toBe(1)
    expect(ctx.err()).toContain('in time')
    expect(ctx.err()).toContain('nothing written')
    expect(
      existsSync(join(sandbox.home, '.config', 'ccprofile', 'hook.ps1'))
    ).toBe(false)
  })
})
