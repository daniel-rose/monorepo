import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'

const CONFIG = {
  profiles: [
    {
      name: 'work',
      remotes: ['gitlab.example.com'],
      accounts: [{ name: 'work-2', configDir: '~/.claude-work-2' }],
    },
    {
      name: 'private',
      configDir: '~/.claude-private',
      remotes: ['github.com/jane'],
      accounts: [{ name: 'seat-2', configDir: '~/.claude-private-2' }],
    },
  ],
}

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let source = ''
let account = ''

const linkTarget = (path: string): string | null =>
  lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink() === true
    ? readlinkSync(path)
    : null

const link = async (args: string[], stdin?: string) => {
  const ctx = sandbox.ctx(sandbox.home)
  const withInput =
    stdin === undefined ? ctx : { ...ctx, stdin: Readable.from([stdin]) }
  const code = await run(['link', ...args], withInput)
  return { code, out: ctx.out(), err: ctx.err() }
}

beforeEach(async () => {
  sandbox = await createSandbox()
  await sandbox.writeConfig(CONFIG)
  source = sandbox.dir('.claude-private')
  account = join(sandbox.home, '.claude-private-2')
  writeFileSync(join(source, 'settings.json'), '{}')
})

afterEach(() => sandbox.cleanup())

describe('link', () => {
  it('creates the account dir, missing source dirs and the links', async () => {
    const result = await link(['private', '--yes'])

    expect(result.code).toBe(0)
    expect(linkTarget(join(account, 'settings.json'))).toBe(
      join(source, 'settings.json')
    )
    for (const dir of ['rules', 'skills', 'plugins', 'projects']) {
      expect(lstatSync(join(source, dir)).isDirectory()).toBe(true)
      expect(linkTarget(join(account, dir))).toBe(join(source, dir))
    }
    expect(result.err).toContain(`link ${join(account, 'settings.json')}`)
  })

  it('skips a missing source file instead of linking it', async () => {
    const result = await link(['private', '--yes'])

    expect(result.code).toBe(0)
    expect(existsSync(join(source, 'CLAUDE.md'))).toBe(false)
    expect(linkTarget(join(account, 'CLAUDE.md'))).toBeNull()
    expect(result.err).toContain(
      `skip ${join(account, 'CLAUDE.md')} (no source)`
    )
  })

  it('changes nothing on a second run', async () => {
    await link(['private', '--yes'])

    const result = await link(['private', '--yes'])

    expect(result.code).toBe(0)
    expect(result.err).toContain('ccprofile: nothing to change')
  })

  it('leaves a regular file alone, links the rest and exits 1', async () => {
    mkdirSync(account)
    writeFileSync(join(account, 'settings.json'), '{"mine":true}')

    const result = await link(['private', '--yes'])

    expect(result.code).toBe(1)
    expect(linkTarget(join(account, 'settings.json'))).toBeNull()
    expect(linkTarget(join(account, 'skills'))).toBe(join(source, 'skills'))
    expect(result.err).toContain(
      `conflict ${join(account, 'settings.json')}: replaced by a file`
    )
  })

  it('leaves a link pointing elsewhere alone', async () => {
    mkdirSync(account)
    const other = sandbox.dir('other-skills')
    symlinkSync(other, join(account, 'skills'))

    const result = await link(['private', '--yes'])

    expect(result.code).toBe(1)
    expect(linkTarget(join(account, 'skills'))).toBe(other)
    expect(result.err).toContain(
      `conflict ${join(account, 'skills')}: points elsewhere (${other})`
    )
  })

  it('reports a source entry of the wrong kind as a conflict', async () => {
    writeFileSync(join(source, 'rules'), '')

    const result = await link(['private', '--yes'])

    expect(result.code).toBe(1)
    expect(linkTarget(join(account, 'rules'))).toBeNull()
    expect(result.err).toContain(
      `conflict ${join(account, 'rules')}: source ${join(source, 'rules')} is not a directory`
    )
  })

  it('writes nothing when the question is declined', async () => {
    const result = await link(['private'], 'n\n')

    expect(result.code).toBe(1)
    expect(existsSync(account)).toBe(false)
    expect(result.err).toContain('ccprofile: nothing written')
  })

  it('applies after a yes', async () => {
    const result = await link(['private'], 'y\n')

    expect(result.code).toBe(0)
    expect(linkTarget(join(account, 'skills'))).toBe(join(source, 'skills'))
  })

  it('links every profile without an argument, ~/.claude for the default one', async () => {
    const result = await link(['--yes'])

    expect(result.code).toBe(0)
    expect(linkTarget(join(sandbox.home, '.claude-work-2', 'skills'))).toBe(
      join(sandbox.home, '.claude', 'skills')
    )
    expect(linkTarget(join(account, 'skills'))).toBe(join(source, 'skills'))
  })

  it('rejects an unknown profile', async () => {
    const result = await link(['nope', '--yes'])

    expect(result.code).toBe(1)
    expect(result.err).toBe('ccprofile: unknown profile "nope"\n')
  })

  it('says so when no profile has accounts', async () => {
    await sandbox.writeConfig({
      profiles: [{ name: 'work', remotes: ['gitlab.example.com'] }],
    })

    const result = await link(['--yes'])

    expect(result.code).toBe(0)
    expect(result.err).toBe('ccprofile: no accounts configured\n')
  })

  it('exits 1 with the issues for an invalid config', async () => {
    await sandbox.writeConfig('{')

    const result = await link(['--yes'])

    expect(result.code).toBe(1)
    expect(result.err).toMatch(/^ccprofile: invalid config .+\nccprofile: {3}/)
  })
})
