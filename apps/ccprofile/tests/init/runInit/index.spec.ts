import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadConfig } from '../../../src/config'
import { EXAMPLE_CONFIG } from '../../../src/constants'
import runInit from '../../../src/init/runInit'
import createSandbox from '../../helpers/createSandbox'

// The $schema of a new config pins the installed major, read independently
// of the code under test, so a major release cannot leave it behind.
const PACKAGE_MAJOR = (
  JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
  ) as { version: string }
).version.split('.')[0]
const SCHEMA = `https://unpkg.com/@daniel-rose/ccprofile@${PACKAGE_MAJOR}/schema.json`

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let configPath = ''

beforeEach(async () => {
  sandbox = await createSandbox()
  configPath = join(sandbox.home, '.config', 'ccprofile', 'config.json')
})

afterEach(() => sandbox.cleanup())

// The wizard itself: wizard.spec.ts.
describe('runInit', () => {
  it('refuses to overwrite an existing config', async () => {
    await sandbox.writeConfig('{"keep":true}')
    const ctx = sandbox.ctx(sandbox.home)

    const code = await runInit(ctx, { example: true })

    expect(code).toBe(1)
    expect(ctx.err()).toBe(`${configPath} already exists, not overwriting\n`)
    expect(readFileSync(configPath, 'utf8')).toBe('{"keep":true}')
  })

  it('exits 1 without a terminal and without --example', async () => {
    const ctx = sandbox.ctx(sandbox.home)

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(1)
    expect(ctx.err()).toContain('--example')
    expect(() => readFileSync(configPath)).toThrow()
  })

  it('writes the example', async () => {
    const ctx = sandbox.ctx(sandbox.home)

    const code = await runInit(ctx, { example: true })

    const text = readFileSync(configPath, 'utf8')
    expect(code).toBe(0)
    // SCHEMA last: a stale $schema in EXAMPLE_CONFIG must not win here too.
    expect(JSON.parse(text)).toEqual({ ...EXAMPLE_CONFIG, $schema: SCHEMA })
    expect(text.endsWith('}\n')).toBe(true)
    expect(Object.keys(JSON.parse(text) as object)[0]).toBe('$schema')
    expect((await loadConfig(ctx)).status).toBe('ok')
    expect(ctx.out().trimEnd().split('\n').at(-1)).toBe(
      'no match (will prompt)'
    )
  })
})
