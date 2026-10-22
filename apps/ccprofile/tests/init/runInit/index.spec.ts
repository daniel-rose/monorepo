import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadConfig } from '../../../src/config'
import { EXAMPLE_CONFIG } from '../../../src/constants'
import runInit from '../../../src/init/runInit'
import createSandbox from '../../helpers/createSandbox'
import installFakeClaude from '../../helpers/installFakeClaude'

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
    expect(JSON.parse(text)).toEqual(EXAMPLE_CONFIG)
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
      $schema: EXAMPLE_CONFIG.$schema,
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
