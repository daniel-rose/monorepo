import { existsSync, lstatSync, readlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import run from '../../../../src/cli'
import createSandbox from '../../../helpers/createSandbox'

const PRIVATE = {
  name: 'private',
  configDir: '~/.claude-private',
  codex: { home: '~/.codex-private' },
  remotes: ['github.com/jane'],
}

type Sandbox = Awaited<ReturnType<typeof createSandbox>>
let sandbox: Sandbox
let source = ''
let seat = ''

const at = (...parts: string[]) => join(sandbox.home, ...parts)

const linkTarget = (path: string): string | null =>
  lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink() === true
    ? readlinkSync(path)
    : null

const link = async (args: string[]) => {
  const ctx = sandbox.ctx(sandbox.home)
  const code = await run(['link', ...args], ctx)
  return { code, out: ctx.out(), err: ctx.err() }
}

beforeEach(async () => {
  sandbox = await createSandbox()
  source = at('.codex-private')
  seat = at('.codex-private-2')
  await sandbox.writeConfig({
    profiles: [
      {
        ...PRIVATE,
        accounts: [
          {
            name: 'seat-2',
            configDir: '~/.claude-private-2',
            codex: { home: '~/.codex-private-2' },
          },
          { name: 'seat-3', configDir: '~/.claude-private-3' },
        ],
      },
    ],
  })
})

afterEach(() => sandbox.cleanup())

describe('link for codex', () => {
  it('creates the codex homes and links the codex entries', async () => {
    sandbox.dir('.codex-private')
    writeFileSync(join(source, 'config.toml'), '')

    const result = await link(['--yes'])

    expect(result.code).toBe(0)
    expect(linkTarget(join(seat, 'config.toml'))).toBe(
      join(source, 'config.toml')
    )
    for (const dir of ['skills', 'plugins', 'rules', 'themes']) {
      expect(lstatSync(join(source, dir)).isDirectory()).toBe(true)
      expect(linkTarget(join(seat, dir))).toBe(join(source, dir))
    }
    expect(existsSync(join(seat, 'AGENTS.md'))).toBe(false)
    expect(result.err).toContain(`[private] codex account seat-2 (${seat})`)
  })

  it('creates the codex home of a profile without further accounts', async () => {
    await sandbox.writeConfig({ profiles: [PRIVATE] })

    const result = await link(['--yes'])

    expect(result.code).toBe(0)
    expect(lstatSync(source).isDirectory()).toBe(true)
    expect(result.err).toContain(`  mkdir ${source}`)
  })

  it('links the codex profile files of the source', async () => {
    sandbox.dir('.codex-private')
    writeFileSync(join(source, 'deep.config.toml'), '')

    await link(['--yes'])

    expect(linkTarget(join(seat, 'deep.config.toml'))).toBe(
      join(source, 'deep.config.toml')
    )
  })

  it('leaves a profile file that only the account has alone', async () => {
    sandbox.dir('.codex-private')
    await link(['--yes'])
    writeFileSync(join(seat, 'own.config.toml'), '')

    const result = await link(['--yes'])

    expect(result.code).toBe(0)
    expect(result.err).not.toContain('own.config.toml')
  })

  it('links no codex entries into an account without codex', async () => {
    await link(['--yes'])

    expect(existsSync(at('.claude-private-3', 'config.toml'))).toBe(false)
  })

  it('links into ~/.codex for a profile without codex', async () => {
    await sandbox.writeConfig({
      profiles: [
        {
          name: 'work',
          remotes: ['gitlab.example.com'],
          accounts: [
            {
              name: 'work-2',
              configDir: '~/.claude-work-2',
              codex: { home: '~/.codex-work-2' },
            },
          ],
        },
      ],
    })

    const result = await link(['--yes'])

    expect(result.code).toBe(0)
    expect(linkTarget(at('.codex-work-2', 'skills'))).toBe(
      at('.codex', 'skills')
    )
  })

  it('changes nothing on a second run', async () => {
    await link(['--yes'])

    const result = await link(['--yes'])

    expect(result.code).toBe(0)
    expect(result.err).toContain('ccprofile: nothing to change')
  })
})
