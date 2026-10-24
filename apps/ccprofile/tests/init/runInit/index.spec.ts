import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadConfig } from '../../../src/config'
import { EXAMPLE_CONFIG } from '../../../src/constants'
import runInit from '../../../src/init/runInit'
import createSandbox from '../../helpers/createSandbox'
import installFakeClaude from '../../helpers/installFakeClaude'

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

const ttyContext = (
  cwd: string,
  lines: string[],
  env: Record<string, string> = {}
) => {
  const stdin = Object.assign(new PassThrough(), { isTTY: true })
  // The input ends after the lines, like a user pressing Ctrl-D.
  stdin.end(lines.map(line => `${line}\n`).join(''))
  return { ...sandbox.ctx(cwd, env), stdin }
}

const prepareClaudeDirs = () => {
  writeFileSync(join(sandbox.home, '.claude.json'), '{}')
  writeFileSync(join(sandbox.dir('.claude-private'), '.claude.json'), '{}')
}

const fakeEnv = () =>
  installFakeClaude(join(sandbox.home, '..'), 'loggedInEmail').env

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

  it('runs the wizard over the found candidates', async () => {
    prepareClaudeDirs()
    const cwd = sandbox.dir('plain')
    const ctx = ttyContext(
      cwd,
      [
        'default',
        'gitlab.example.com',
        'private',
        '~/Projects/private',
        'prompt',
      ],
      fakeEnv()
    )

    const code = await runInit(ctx, { example: false })

    const loaded = await loadConfig(ctx)
    expect(code).toBe(0)
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    expect(loaded.config.profiles).toHaveLength(2)
    expect(JSON.parse(readFileSync(configPath, 'utf8'))).toEqual({
      $schema: SCHEMA,
      onUnknown: 'prompt',
      profiles: [
        { name: 'default', remotes: ['gitlab.example.com'] },
        {
          name: 'private',
          configDir: '~/.claude-private',
          paths: ['~/Projects/private'],
        },
      ],
    })
    expect(ctx.out()).toBe('no match (will prompt)\n')
    expect(ctx.err()).toContain('logged in as jane@example.test (max)')
  })

  it('skips a candidate at an empty name', async () => {
    prepareClaudeDirs()
    const ctx = ttyContext(
      sandbox.dir('plain'),
      ['', 'private', '~/Projects/private', ''],
      fakeEnv()
    )

    const code = await runInit(ctx, { example: false })

    const loaded = await loadConfig(ctx)
    expect(code).toBe(0)
    expect(loaded.status === 'ok' && loaded.config.profiles).toHaveLength(1)
  })

  it('suggests the remote namespace of the current repo', async () => {
    prepareClaudeDirs()
    const repo = await sandbox.repo('w/app', 'git@github.com:acme/app.git')
    const ctx = ttyContext(repo, ['default', '', '', ''], fakeEnv())

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(0)
    expect(ctx.err()).toContain('github.com/acme')
    const written = JSON.parse(readFileSync(configPath, 'utf8')) as {
      profiles: unknown
    }
    expect(written.profiles).toEqual([
      { name: 'default', remotes: ['github.com/acme'] },
    ])
    expect(ctx.out()).toBe('default (remote github.com/acme)\n')
  })

  it('re-asks an invalid name and aborts at end of input', async () => {
    prepareClaudeDirs()
    const ctx = ttyContext(sandbox.dir('plain'), ['prompt'], fakeEnv())

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(1)
    expect(() => readFileSync(configPath)).toThrow()
  })
})

describe('runInit wizard details', () => {
  const onlyDefault = () =>
    writeFileSync(join(sandbox.home, '.claude.json'), '{}')

  const writtenConfig = () =>
    JSON.parse(readFileSync(configPath, 'utf8')) as {
      onUnknown: string
      profiles: unknown[]
    }

  it.each([
    [
      'git@gitlab.example.com:group/sub/app.git',
      'gitlab.example.com/group/sub',
    ],
    ['git@github.com:acme/app.git', 'github.com/acme'],
    ['git@example.test:app.git', 'example.test'],
  ])('suggests %s as %s', async (origin, expected) => {
    onlyDefault()
    const repo = await sandbox.repo('w/app', origin)
    const ctx = ttyContext(repo, ['default', '', ''], fakeEnv())

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(0)
    expect(ctx.err()).toContain(`[${expected}]`)
    expect(writtenConfig().profiles).toEqual([
      { name: 'default', remotes: [expected] },
    ])
  })

  it('re-asks after an invalid entry and then writes', async () => {
    onlyDefault()
    const ctx = ttyContext(
      sandbox.dir('plain'),
      ['default', './proj, proj/x, file:///x', 'gitlab.example.com', ''],
      fakeEnv()
    )

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(0)
    expect(ctx.err()).toContain('"./proj" is not a git remote')
    expect(writtenConfig().profiles).toEqual([
      { name: 'default', remotes: ['gitlab.example.com'] },
    ])
  })

  it('rejects a relative path-like entry', async () => {
    onlyDefault()
    const ctx = ttyContext(
      sandbox.dir('plain'),
      ['default', '~other/x', '~/Projects', ''],
      fakeEnv()
    )

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(0)
    expect(ctx.err()).toContain('"~other/x" is not')
    expect(writtenConfig().profiles).toEqual([
      { name: 'default', paths: ['~/Projects'] },
    ])
  })

  it('exits 1 and writes nothing when only invalid entries come', async () => {
    onlyDefault()
    const ctx = ttyContext(
      sandbox.dir('plain'),
      ['default', './proj'],
      fakeEnv()
    )

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(1)
    expect(() => readFileSync(configPath)).toThrow()
  })

  it('says that an entry is required when there is no suggestion', async () => {
    onlyDefault()
    const ctx = ttyContext(
      sandbox.dir('plain'),
      ['default', '', 'github.com/jane', ''],
      fakeEnv()
    )

    await runInit(ctx, { example: false })

    expect(ctx.err()).toContain('at least one remote or path is required')
  })

  it('re-asks an unknown onUnknown name', async () => {
    onlyDefault()
    const ctx = ttyContext(
      sandbox.dir('plain'),
      ['default', 'github.com/jane', 'nope', 'default'],
      fakeEnv()
    )

    const code = await runInit(ctx, { example: false })

    expect(code).toBe(0)
    expect(ctx.err()).toContain('"nope" is not a profile name')
    expect(writtenConfig().onUnknown).toBe('default')
    expect(ctx.out()).toBe('default (onUnknown)\n')
  })
})
