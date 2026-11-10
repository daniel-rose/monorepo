import { existsSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import runAdd from '../../../src/add/runAdd'
import { input } from '../../../src/prompt'
import addWizard from '../../helpers/addWizard'
import createSandbox from '../../helpers/createSandbox'

vi.mock('../../../src/prompt')

type Sandbox = Awaited<ReturnType<typeof createSandbox>>

const WORK = { name: 'work', remotes: ['gitlab.example.com'] }

let sandbox: Sandbox
let w: ReturnType<typeof addWizard>

beforeEach(async () => {
  sandbox = await createSandbox()
  w = addWizard(sandbox)
  w.resetPrompts()
})

afterEach(() => sandbox.cleanup())

const profilesWritten = () =>
  (JSON.parse(w.readConfigText()) as { profiles: unknown[] }).profiles

const claudeDir = (name: string) => {
  const dir = sandbox.dir(name)
  writeFileSync(join(dir, '.claude.json'), '{}')
  return dir
}

describe('runAdd wizard', () => {
  it('asks for the name and rejects one already taken', async () => {
    await sandbox.writeConfig({ profiles: [WORK] })
    w.answerInputs('private', '~/.claude-private', 'github.com/jane')

    await runAdd(w.ttyContext(sandbox.dir('plain')), { yes: true })

    expect(w.inputConfig(0).message).toBe('Name of the new profile')
    expect(w.inputConfig(0).validate?.('work')).toBe(
      '"work" is reserved, duplicate or invalid'
    )
  })

  it('offers free directories with their login, never configured ones', async () => {
    claudeDir('.claude-old')
    claudeDir('.claude-work-2')
    writeFileSync(join(sandbox.home, '.claude.json'), '{}')
    await sandbox.writeConfig({
      profiles: [
        {
          ...WORK,
          configDir: '~/.claude-work',
          accounts: [{ name: 'work-2', configDir: '~/.claude-work-2' }],
        },
      ],
    })
    w.answerSelects(null)

    await runAdd(w.ttyContext(sandbox.dir('plain')), { name: 'p' })

    const config = w.selectConfig(0)
    expect(config.message).toBe('Claude config directory for p')
    expect(config.choices.map(({ name }) => name)).toEqual([
      '~/.claude (default): logged in as jane@example.test (max)',
      '~/.claude-old: logged in as jane@example.test (max)',
      'new directory',
    ])
  })

  it('does not offer ~/.claude while a profile uses it', async () => {
    writeFileSync(join(sandbox.home, '.claude.json'), '{}')
    await sandbox.writeConfig({ profiles: [WORK] })
    w.answerSelects(null)

    await runAdd(w.ttyContext(sandbox.dir('plain')), { name: 'p' })

    expect(w.selectConfig(0).choices.map(({ name }) => name)).toEqual([
      'new directory',
    ])
  })

  it('takes an existing directory as it is', async () => {
    claudeDir('.claude-old')
    await sandbox.writeConfig({ profiles: [WORK] })
    vi.mocked(input).mockResolvedValueOnce('github.com/jane')
    w.answerSelects({
      kind: 'existing',
      configDir: join(sandbox.home, '.claude-old'),
    })

    await runAdd(w.ttyContext(sandbox.dir('plain')), {
      name: 'old',
      yes: true,
    })

    expect(profilesWritten()[1]).toEqual({
      name: 'old',
      configDir: '~/.claude-old',
      codex: false,
      remotes: ['github.com/jane'],
    })
  })

  it('suggests ~/.claude-<name> and refuses a directory in use', async () => {
    await sandbox.writeConfig({
      profiles: [{ ...WORK, configDir: '~/.claude-work' }],
    })
    w.answerInputs(null)

    await runAdd(w.ttyContext(sandbox.dir('plain')), { name: 'p' })

    expect(w.inputConfig(0)).toMatchObject({
      message: 'New Claude config directory for p',
      default: '~/.claude-p',
    })
    expect(w.inputConfig(0).validate?.('~/.claude-work')).toContain(
      'already used'
    )
    expect(w.inputConfig(0).validate?.('~/.claude')).toContain('already used')
  })

  it('presets codex to ~/.codex when no profile uses it', async () => {
    await sandbox.writeConfig({ profiles: [{ ...WORK, codex: false }] })
    w.answerInputs('~/.claude-p', 'github.com/jane')

    await runAdd(w.ttyContext(sandbox.dir('plain')), {
      name: 'p',
      yes: true,
    })

    expect(w.selectConfig(1).default).toBe('default')
    expect(profilesWritten()[1]).not.toHaveProperty('codex')
  })

  it('creates an own codex home and names its login', async () => {
    await sandbox.writeConfig({ profiles: [WORK] })
    const ctx = w.ttyContext(sandbox.dir('plain'))
    w.answerSelects({ kind: 'new' }, 'home')
    w.answerInputs('~/.claude-p', '~/.codex-p', 'github.com/jane')

    expect(await runAdd(ctx, { name: 'p', yes: true })).toBe(0)

    expect(w.inputConfig(1).default).toBe('~/.codex-p')
    expect(profilesWritten()[1]).toMatchObject({
      codex: { home: '~/.codex-p' },
    })
    expect(existsSync(join(sandbox.home, '.codex-p'))).toBe(true)
    expect(ctx.out()).toContain('log in to codex: CCPROFILE=p codex login')
  })

  it('suggests the origin of the current repository as matcher', async () => {
    await sandbox.writeConfig({ profiles: [WORK] })
    const repo = await sandbox.repo('p/app', 'git@github.com:jane/app.git')
    w.answerInputs('~/.claude-p', null)

    await runAdd(w.ttyContext(repo), { name: 'p' })

    expect(w.inputConfig(1)).toMatchObject({ default: 'github.com/jane' })
    expect(w.inputConfig(1).validate?.('')).toBe(
      'at least one remote or path is required'
    )
  })

  it('inserts before the chosen profile', async () => {
    await sandbox.writeConfig({ profiles: [WORK] })
    w.answerSelects({ kind: 'new' }, 'disabled', 0)
    w.answerInputs('~/.claude-p', 'gitlab.example.com/jane')

    await runAdd(w.ttyContext(sandbox.dir('plain')), {
      name: 'p',
      yes: true,
    })

    expect(w.selectConfig(2).choices.map(({ name }) => name)).toEqual([
      'before work',
      'at the end',
    ])
    expect(profilesWritten().map(p => (p as { name: string }).name)).toEqual([
      'p',
      'work',
    ])
  })

  it('writes and creates nothing when a prompt is cancelled', async () => {
    await sandbox.writeConfig({ profiles: [WORK] })
    const ctx = w.ttyContext(sandbox.dir('plain'))
    w.answerInputs('~/.claude-p', null)

    expect(await runAdd(ctx, { name: 'p', yes: true })).toBe(1)
    expect(ctx.err()).toContain('ccprofile: aborted, nothing written')
    expect(profilesWritten()).toHaveLength(1)
    expect(existsSync(join(sandbox.home, '.claude-p'))).toBe(false)
  })

  it.skipIf(process.platform === 'win32')(
    'checks again after mkdir and names the directories it left',
    async () => {
      symlinkSync(sandbox.home, join(sandbox.home, 'link'))
      await sandbox.writeConfig({
        profiles: [
          WORK,
          { name: 'x', configDir: '~/.claude-x', paths: ['/x'] },
        ],
      })
      const ctx = w.ttyContext(sandbox.dir('plain'))
      w.answerInputs('~/link/.claude-x', 'github.com/jane')

      expect(await runAdd(ctx, { name: 'p', yes: true })).toBe(1)
      expect(ctx.err()).toContain('the new config would be invalid')
      expect(ctx.err()).toContain('same directory as profiles[1]')
      expect(ctx.err()).toContain('empty, remove it if not needed')
      expect(profilesWritten()).toHaveLength(2)
    }
  )
})
