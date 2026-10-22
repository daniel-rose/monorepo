import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import resolveProfile from '../../../src/resolve/resolveProfile'
import type { ResolveOutcome } from '../../../src/resolve/types'
import createSandbox from '../../helpers/createSandbox'

const BASE = {
  profiles: [
    { name: 'work', remotes: ['gitlab.example.com'] },
    {
      name: 'private',
      configDir: '~/.claude-private',
      remotes: ['github.com/jane'],
      paths: ['~/Projects/private'],
    },
  ],
}

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let workRepo = ''
let dotfiles = ''
let foreign = ''
let plain = ''
let privateNotes = ''
let privateForeign = ''

const interactive = { interactive: true }
const batch = { interactive: false }

const profileOf = (outcome: ResolveOutcome) =>
  outcome.kind === 'profile' ? outcome.profile : undefined

beforeAll(async () => {
  sandbox = await createSandbox()
  workRepo = await sandbox.repo('w/app', 'git@gitlab.example.com:acme/app.git')
  dotfiles = await sandbox.repo(
    'd/dotfiles',
    'git@github.com:jane/dotfiles.git'
  )
  foreign = await sandbox.repo('f/other', 'git@elsewhere.example:x/y.git')
  plain = sandbox.dir('plain')
  privateNotes = sandbox.dir('Projects/private/notes')
  privateForeign = await sandbox.repo(
    'Projects/private/other',
    'git@elsewhere.example:x/y.git'
  )
})

afterAll(() => sandbox.cleanup())

// Some tests create the private configDir; keep the others independent.
afterEach(() => {
  rmSync(join(sandbox.home, '.claude-private'), {
    recursive: true,
    force: true,
  })
})

describe('resolveProfile detection', () => {
  it.each([
    { label: 'work remote', cwd: () => workRepo, name: 'work', via: 'remote' },
    {
      label: 'ssh github remote',
      cwd: () => dotfiles,
      name: 'private',
      via: 'remote',
    },
    { label: 'path', cwd: () => privateNotes, name: 'private', via: 'path' },
    {
      label: 'path beats foreign remote',
      cwd: () => privateForeign,
      name: 'private',
      via: 'path',
    },
  ])('$label', async ({ cwd, name, via }) => {
    await sandbox.writeConfig(BASE)
    const ctx = sandbox.ctx(cwd())
    const outcome = await resolveProfile([], ctx, batch)

    expect(outcome).toMatchObject({ kind: 'profile', reason: 'match' })
    expect(profileOf(outcome)?.name).toBe(name)
    expect(outcome.kind === 'profile' && outcome.match?.via).toBe(via)
    expect(ctx.err()).not.toContain('no match')
  })

  it('leaves the default profile without configDir', async () => {
    await sandbox.writeConfig(BASE)
    const outcome = await resolveProfile([], sandbox.ctx(workRepo), batch)
    expect(profileOf(outcome)?.configDir).toBeUndefined()
  })

  it.each([
    { label: 'foreign repo', cwd: () => foreign },
    { label: 'plain directory', cwd: () => plain },
  ])('returns noMatch for a $label when not interactive', async ({ cwd }) => {
    await sandbox.writeConfig(BASE)
    const ctx = sandbox.ctx(cwd(), { GIT_CEILING_DIRECTORIES: sandbox.home })
    expect(await resolveProfile([], ctx, batch)).toEqual({ kind: 'noMatch' })
  })
})

describe('resolveProfile overrides', () => {
  it('keeps an explicit CLAUDE_CONFIG_DIR', async () => {
    await sandbox.writeConfig(BASE)
    const ctx = sandbox.ctx(workRepo, { CLAUDE_CONFIG_DIR: '/explicit' })
    expect(await resolveProfile([], ctx, batch)).toEqual({
      kind: 'unchanged',
      reason: 'explicitConfigDir',
    })
  })

  it('treats an empty CLAUDE_CONFIG_DIR as unset', async () => {
    await sandbox.writeConfig(BASE)
    const ctx = sandbox.ctx(workRepo, { CLAUDE_CONFIG_DIR: '' })
    expect(profileOf(await resolveProfile([], ctx, batch))?.name).toBe('work')
  })

  it('passes --version through', async () => {
    await sandbox.writeConfig(BASE)
    expect(
      await resolveProfile(['--version'], sandbox.ctx(workRepo), batch)
    ).toEqual({ kind: 'unchanged', reason: 'passthrough' })
  })

  it('uses CCPROFILE by name', async () => {
    await sandbox.writeConfig(BASE)
    const ctx = sandbox.ctx(foreign, { CCPROFILE: 'private' })
    const outcome = await resolveProfile([], ctx, batch)
    expect(outcome).toMatchObject({
      kind: 'profile',
      reason: 'explicitProfile',
    })
    expect(profileOf(outcome)?.name).toBe('private')
  })

  it('rejects an unknown CCPROFILE', async () => {
    await sandbox.writeConfig(BASE)
    const ctx = sandbox.ctx(foreign, { CCPROFILE: 'missing' })
    expect(await resolveProfile([], ctx, batch)).toEqual({
      kind: 'error',
      messages: ['ccprofile: unknown profile "missing"'],
    })
  })

  it('treats an empty CCPROFILE as unset', async () => {
    await sandbox.writeConfig(BASE)
    const ctx = sandbox.ctx(workRepo, { CCPROFILE: '' })
    expect(profileOf(await resolveProfile([], ctx, batch))?.name).toBe('work')
  })

  it('warns about a missing configDir for an explicit profile', async () => {
    await sandbox.writeConfig(BASE)
    const ctx = sandbox.ctx(foreign, { CCPROFILE: 'private' })
    await resolveProfile([], ctx, batch)
    expect(ctx.err()).toBe(
      `ccprofile: creating new profile "private" at ${join(sandbox.home, '.claude-private')}, first start will ask for login\n`
    )
  })

  it('does not warn when the configDir exists', async () => {
    await sandbox.writeConfig(BASE)
    sandbox.dir('.claude-private')
    const ctx = sandbox.ctx(foreign, { CCPROFILE: 'private' })
    await resolveProfile([], ctx, batch)
    expect(ctx.err()).toBe('')
  })
})

describe('resolveProfile order', () => {
  it('passes --version through with a broken config', async () => {
    await sandbox.writeConfig('{ nope')
    expect(
      await resolveProfile(['--version'], sandbox.ctx(workRepo), batch)
    ).toEqual({ kind: 'unchanged', reason: 'passthrough' })
  })

  it('reports a broken config otherwise', async () => {
    await sandbox.writeConfig('{ nope')
    const ctx = sandbox.ctx(workRepo)
    const outcome = await resolveProfile(['-p', 'hi'], ctx, batch)
    expect(outcome.kind).toBe('error')
    if (outcome.kind !== 'error') return
    expect(outcome.messages[0]).toBe(
      `ccprofile: invalid config ${join(sandbox.home, '.config/ccprofile/config.json')}`
    )
    expect(outcome.messages.length).toBeGreaterThan(1)
    for (const message of outcome.messages.slice(1)) {
      expect(message).toMatch(/^ccprofile: {3}\S/)
    }
    expect(ctx.err()).toBe('')
  })

  it('is a no-op without a config file, even with CCPROFILE', async () => {
    const empty = sandbox.dir('empty-xdg')
    const ctx = sandbox.ctx(workRepo, {
      CCPROFILE: 'work',
      XDG_CONFIG_HOME: empty,
    })
    const outcome = await resolveProfile([], ctx, batch)
    expect(outcome).toEqual({ kind: 'unchanged', reason: 'noConfig' })
    expect(ctx.err()).toBe('')
  })
})

describe('resolveProfile onUnknown', () => {
  it('uses the named profile and says so', async () => {
    await sandbox.writeConfig({ ...BASE, onUnknown: 'private' })
    sandbox.dir('.claude-private')
    const ctx = sandbox.ctx(foreign)
    const outcome = await resolveProfile([], ctx, batch)
    expect(outcome).toMatchObject({ kind: 'profile', reason: 'onUnknown' })
    expect(profileOf(outcome)?.name).toBe('private')
    expect(ctx.err()).toBe('ccprofile: no match, using "private" (onUnknown)\n')
  })
})

describe('resolveProfile passthrough list', () => {
  it('uses a custom list', async () => {
    await sandbox.writeConfig({ ...BASE, passthrough: ['mcp'] })
    const ctx = sandbox.ctx(workRepo)
    expect(await resolveProfile(['mcp', 'list'], ctx, batch)).toMatchObject({
      kind: 'unchanged',
    })
    expect(await resolveProfile(['--version'], ctx, batch)).toMatchObject({
      kind: 'profile',
    })
  })

  it.each([
    { args: ['a', '-x'], kind: 'unchanged' },
    { args: ['--', '-x'], kind: 'profile' },
    { args: ['update'], kind: 'unchanged' },
    { args: ['-p', 'update'], kind: 'profile' },
  ])('$args -> $kind', async ({ args, kind }) => {
    await sandbox.writeConfig({ ...BASE, passthrough: ['-x', 'update'] })
    const outcome = await resolveProfile(args, sandbox.ctx(workRepo), batch)
    expect(outcome.kind).toBe(kind)
  })
})

describe('resolveProfile prompt', () => {
  const ask = (input: string) => {
    const ctx = sandbox.ctx(foreign)
    return { ctx, stdin: Readable.from([input]) }
  }

  it('selects a profile and prints the hint', async () => {
    await sandbox.writeConfig(BASE)
    const { ctx, stdin } = ask('2\n')
    const outcome = await resolveProfile([], { ...ctx, stdin }, interactive)
    expect(outcome).toMatchObject({ kind: 'profile', reason: 'prompt' })
    expect(profileOf(outcome)?.name).toBe('private')
    expect(ctx.err()).toContain(
      'ccprofile: add a "paths" or "remotes" entry to skip this prompt\n'
    )
  })

  it('aborts on an empty answer', async () => {
    await sandbox.writeConfig(BASE)
    const { ctx, stdin } = ask('\n')
    expect(await resolveProfile([], { ...ctx, stdin }, interactive)).toEqual({
      kind: 'error',
      messages: ['ccprofile: aborted'],
    })
  })

  it('does not prompt when not interactive', async () => {
    await sandbox.writeConfig(BASE)
    const { ctx, stdin } = ask('2\n')
    expect(await resolveProfile([], { ...ctx, stdin }, batch)).toEqual({
      kind: 'noMatch',
    })
    expect(ctx.err()).toBe('')
  })

  it('warns about a missing configDir after a pick', async () => {
    await sandbox.writeConfig(BASE)
    const { ctx, stdin } = ask('2\n')
    await resolveProfile([], { ...ctx, stdin }, interactive)
    expect(ctx.err()).toContain(
      `ccprofile: creating new profile "private" at ${join(sandbox.home, '.claude-private')}, first start will ask for login`
    )
  })
})
