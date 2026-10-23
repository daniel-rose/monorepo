import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import { MARKER } from '../../../../src/constants'
import { readHook } from '../../../../src/hook'
import createSandbox from '../../../helpers/createSandbox'
import installFakeClaude from '../../../helpers/installFakeClaude'

type Sandbox = Awaited<ReturnType<typeof createSandbox>>

describe('doctor', () => {
  let sandbox: Sandbox

  beforeEach(async () => {
    sandbox = await createSandbox()
  })

  afterEach(async () => {
    await sandbox.cleanup()
  })

  const write = (file: string, content: string) => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
  }

  const installZsh = async () => {
    const hookFile = join(sandbox.home, '.config', 'ccprofile', 'hook.zsh')
    write(hookFile, await readHook('zsh'))
    write(
      join(sandbox.home, '.zshrc'),
      `${[MARKER.start, `source '${hookFile}'`, MARKER.end].join('\n')}\n`
    )
  }

  const makeCtx = (mode: string) => {
    const fake = installFakeClaude(join(sandbox.home, '..'), mode)
    return {
      ...sandbox.ctx(sandbox.home, {
        ...fake.env,
        HOME: sandbox.home,
        SHELL: '/bin/zsh',
        XDG_CONFIG_HOME: join(sandbox.home, '.config'),
      }),
      platform: 'linux' as NodeJS.Platform,
    }
  }

  it('prints ok lines and exits 0 when everything is fine', async () => {
    const present = sandbox.dir('Projects/acme')
    await sandbox.writeConfig({
      profiles: [{ name: 'work', paths: [present] }],
    })
    await installZsh()
    const ctx = makeCtx('loggedInEmail')

    const code = await run(['doctor'], ctx)

    expect(code).toBe(0)
    const lines = ctx.out().trimEnd().split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(6)
    expect(lines.every(line => line.startsWith('ok    '))).toBe(true)
    expect(ctx.out()).toContain('jane@example.test')
    expect(ctx.err()).toBe('')
  })

  it('prints warn lines but still exits 0 without fails', async () => {
    await sandbox.writeConfig({
      profiles: [{ name: 'work', paths: [join(sandbox.home, 'gone')] }],
    })
    await installZsh()
    const ctx = makeCtx('loggedOut')

    const code = await run(['doctor'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toMatch(/^warn {2}.*work.*not logged in/m)
    expect(ctx.out()).toMatch(/^warn {2}.*gone/m)
  })

  it('exits 1 with a fail line for an invalid config', async () => {
    await sandbox.writeConfig('{ nope')
    await installZsh()
    const ctx = makeCtx('loggedIn')

    const code = await run(['doctor'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toMatch(/^fail {2}config/m)
  })

  it('exits 1 when claude is not on the PATH', async () => {
    await sandbox.writeConfig({ profiles: [{ name: 'work' }] })
    await installZsh()
    const ctx = {
      ...makeCtx('loggedIn'),
      runCommand: () =>
        Promise.resolve({
          exitCode: null,
          stdout: '',
          stderr: '',
          timedOut: false,
          notFound: true,
        }),
    }

    const code = await run(['doctor'], ctx)

    expect(code).toBe(1)
    expect(ctx.out()).toMatch(/^fail {2}.*claude/m)
    // Reported once, not once per profile.
    expect(ctx.out().match(/claude/g)).toHaveLength(1)
  })

  it('warns and skips config checks when there is no config', async () => {
    await installZsh()
    const ctx = makeCtx('loggedIn')

    const code = await run(['doctor'], ctx)

    expect(code).toBe(0)
    expect(ctx.out()).toMatch(/^warn {2}no config .*ccprofile init/m)
  })

  it('never writes anything', async () => {
    const ctx = makeCtx('loggedIn')

    await run(['doctor'], ctx)

    const { existsSync } = await import('node:fs')
    expect(existsSync(join(sandbox.home, '.config'))).toBe(false)
    expect(existsSync(join(sandbox.home, '.zshrc'))).toBe(false)
  })
})
