import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import runAdd from '../../../src/add/runAdd'
import { CONFIG_FILE } from '../../../src/constants'
import addWizard from '../../helpers/addWizard'
import createSandbox from '../../helpers/createSandbox'

vi.mock('../../../src/prompt')

type Sandbox = Awaited<ReturnType<typeof createSandbox>>

const BOM = CONFIG_FILE.byteOrderMark

// An existing config with values `add` must keep as they are.
const CONFIG = {
  $schema: 'https://example.test/own-schema.json',
  onUnknown: 'work',
  passthrough: ['--version'],
  accountThreshold: 80,
  profiles: [{ name: 'work', remotes: ['gitlab.example.com'] }],
}

let sandbox: Sandbox
let w: ReturnType<typeof addWizard>

beforeEach(async () => {
  sandbox = await createSandbox()
  w = addWizard(sandbox)
  w.resetPrompts()
})

afterEach(() => sandbox.cleanup())

describe('runAdd preconditions', () => {
  it('needs a terminal', async () => {
    await sandbox.writeConfig(CONFIG)
    const ctx = sandbox.ctx(sandbox.home)

    expect(await runAdd(ctx, { name: 'private' })).toBe(1)
    expect(ctx.err()).toBe('ccprofile: add needs a terminal – run it in one\n')
  })

  it('points to init without a config', async () => {
    const ctx = w.ttyContext(sandbox.home)

    expect(await runAdd(ctx, {})).toBe(1)
    expect(ctx.err()).toContain('create one with `ccprofile init`')
  })

  it('refuses an invalid config without asking', async () => {
    await sandbox.writeConfig({ profiles: [] })
    const ctx = w.ttyContext(sandbox.home)

    expect(await runAdd(ctx, {})).toBe(1)
    expect(ctx.err()).toContain('ccprofile: invalid config')
    expect(ctx.err()).toContain('must contain at least one profile')
    expect(w.readConfigText()).toBe('{"profiles":[]}')
  })

  it.each(['work', 'prompt', 'bad name'])(
    'refuses the name %s before asking anything',
    async name => {
      await sandbox.writeConfig(CONFIG)
      const ctx = w.ttyContext(sandbox.home)

      expect(await runAdd(ctx, { name })).toBe(1)
      expect(ctx.err()).toBe(
        `ccprofile: "${name}" is reserved, already a profile or invalid\n`
      )
    }
  )
})

describe('runAdd writing', () => {
  it('keeps every other value and adds the profile at the end', async () => {
    await sandbox.writeConfig(CONFIG)
    const ctx = w.ttyContext(sandbox.dir('plain'))
    w.answerInputs('~/.claude-private', 'github.com/jane')

    const code = await runAdd(ctx, { name: 'private', yes: true })

    expect(code).toBe(0)
    expect(JSON.parse(w.readConfigText())).toEqual({
      ...CONFIG,
      profiles: [
        ...CONFIG.profiles,
        {
          name: 'private',
          configDir: '~/.claude-private',
          codex: false,
          remotes: ['github.com/jane'],
        },
      ],
    })
    expect(w.readConfigText().endsWith('}\n')).toBe(true)
    expect(existsSync(join(sandbox.home, '.claude-private'))).toBe(true)
    expect(ctx.out()).toBe(
      'log in to claude: CCPROFILE=private claude, then /login\n'
    )
    expect(ctx.err()).toContain('+      "name": "private",')
    expect(ctx.err()).toContain(
      `created ${join(sandbox.home, '.claude-private')}`
    )
  })

  it('leaves a missing $schema out and keeps a byte order mark', async () => {
    const withoutSchema = { ...CONFIG, $schema: undefined }
    await sandbox.writeConfig(`${BOM}${JSON.stringify(withoutSchema)}`)
    const ctx = w.ttyContext(sandbox.dir('plain'))
    w.answerInputs('~/.claude-private', 'github.com/jane')

    await runAdd(ctx, { name: 'private', yes: true })

    const text = w.readConfigText()
    expect(text.startsWith(BOM)).toBe(true)
    expect(JSON.parse(text.slice(1))).not.toHaveProperty('$schema')
  })

  it('extends a single profile without matchers that is onUnknown', async () => {
    await sandbox.writeConfig({
      onUnknown: 'work',
      profiles: [{ name: 'work' }],
    })
    const ctx = w.ttyContext(sandbox.dir('plain'))
    w.answerInputs('~/.claude-private', 'github.com/jane')

    expect(await runAdd(ctx, { name: 'private', yes: true })).toBe(0)
    expect(JSON.parse(w.readConfigText())).toMatchObject({
      onUnknown: 'work',
      profiles: [{ name: 'work' }, { name: 'private' }],
    })
  })

  it('writes and creates nothing when the change is declined', async () => {
    await sandbox.writeConfig(CONFIG)
    const ctx = w.ttyContext(sandbox.dir('plain'))
    w.answerInputs('~/.claude-private', 'github.com/jane')

    expect(await runAdd(ctx, { name: 'private' })).toBe(1)
    expect(ctx.err()).toContain('ccprofile: nothing written')
    expect(JSON.parse(w.readConfigText())).toEqual(CONFIG)
    expect(existsSync(join(sandbox.home, '.claude-private'))).toBe(false)
  })

  it('writes and creates nothing when the file changed meanwhile', async () => {
    await sandbox.writeConfig(CONFIG)
    const ctx = w.ttyContext(sandbox.dir('plain'))
    w.answerInputs('~/.claude-private', 'github.com/jane')
    const { confirm } = await import('../../../src/prompt')
    vi.mocked(confirm).mockImplementationOnce(() => {
      writeFileSync(join(sandbox.home, '.config/ccprofile/config.json'), '{}')
      return Promise.resolve(true)
    })

    expect(await runAdd(ctx, { name: 'private' })).toBe(1)
    expect(ctx.err()).toContain('changed meanwhile, nothing written')
    expect(w.readConfigText()).toBe('{}')
    expect(existsSync(join(sandbox.home, '.claude-private'))).toBe(false)
  })
})
