import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import loadConfig from '../../../src/config/loadConfig'
import type { ResolvedConfig } from '../../../src/config/types'
import { LOAD_STATUS } from '../../../src/constants'
import findProfile from '../../../src/resolve/findProfile'
import createSandbox from '../../helpers/createSandbox'

let sandbox: Awaited<ReturnType<typeof createSandbox>>

const load = async (config: unknown, cwd: string): Promise<ResolvedConfig> => {
  // Only one profile may omit configDir; the others get their own.
  const profiles = (config as { profiles: { name: string }[] }).profiles
  await sandbox.writeConfig({
    profiles: profiles.map((profile, index) =>
      index === 0
        ? profile
        : { configDir: `~/.claude-${profile.name}`, ...profile }
    ),
  })
  const result = await loadConfig(sandbox.ctx(cwd))
  if (result.status !== LOAD_STATUS.ok) throw new Error('config not ok')
  return result.config
}

let privateRepo = ''
let notes = ''

beforeAll(async () => {
  sandbox = await createSandbox()
  privateRepo = await sandbox.repo(
    'Projects/private/repo',
    'git@foreign.example:x/y.git'
  )
  notes = sandbox.dir('Projects/private/notes')
})

afterAll(() => sandbox.cleanup())

describe('findProfile', () => {
  it('matches by path', async () => {
    const config = await load(
      {
        profiles: [
          { name: 'private', paths: ['~/Projects/private'] },
          { name: 'work', remotes: ['gitlab.example.com'] },
        ],
      },
      notes
    )
    const match = await findProfile(config, sandbox.ctx(notes))
    expect(match?.profile.name).toBe('private')
    expect(match?.via).toBe('path')
    expect(match?.entry).toBe(config.profiles[0]?.paths[0])
  })

  it('matches by remote', async () => {
    const work = await sandbox.repo(
      'work/app',
      'git@gitlab.example.com:acme/app.git'
    )
    const config = await load(
      {
        profiles: [
          { name: 'private', paths: ['~/Projects/private'] },
          { name: 'work', remotes: ['gitlab.example.com'] },
        ],
      },
      work
    )
    const match = await findProfile(config, sandbox.ctx(work))
    expect(match).toMatchObject({
      via: 'remote',
      entry: 'gitlab.example.com',
    })
    expect(match?.profile.name).toBe('work')
  })

  it('lets an earlier remote match beat a later path match', async () => {
    const config = await load(
      {
        profiles: [
          { name: 'foreign', remotes: ['foreign.example'] },
          { name: 'private', paths: ['~/Projects/private'] },
        ],
      },
      privateRepo
    )
    const match = await findProfile(config, sandbox.ctx(privateRepo))
    expect(match?.profile.name).toBe('foreign')
    expect(match?.via).toBe('remote')
  })

  it('lets an earlier path match beat a later remote match', async () => {
    const config = await load(
      {
        profiles: [
          { name: 'private', paths: ['~/Projects/private'] },
          { name: 'foreign', remotes: ['foreign.example'] },
        ],
      },
      privateRepo
    )
    const match = await findProfile(config, sandbox.ctx(privateRepo))
    expect(match?.profile.name).toBe('private')
  })

  it('skips missing path entries silently', async () => {
    const config = await load(
      {
        profiles: [
          { name: 'ghost', paths: ['~/does/not/exist'] },
          { name: 'private', paths: ['~/Projects/private'] },
        ],
      },
      notes
    )
    expect((await findProfile(config, sandbox.ctx(notes)))?.profile.name).toBe(
      'private'
    )
  })

  it('does not read the origin when a path matched first', async () => {
    const config = await load(
      {
        profiles: [
          { name: 'private', paths: ['~/Projects/private'] },
          { name: 'foreign', remotes: ['foreign.example'] },
        ],
      },
      notes
    )
    const ctx = sandbox.ctx(notes)
    let calls = 0
    const runCommand = ctx.runCommand
    ctx.runCommand = (...args) => {
      calls += 1
      return runCommand(...args)
    }
    await findProfile(config, ctx)
    expect(calls).toBe(0)
  })

  it('reads the origin at most once', async () => {
    const config = await load(
      {
        profiles: [
          { name: 'a', remotes: ['a.example'] },
          { name: 'b', remotes: ['b.example'] },
        ],
      },
      privateRepo
    )
    const ctx = sandbox.ctx(privateRepo)
    let calls = 0
    const runCommand = ctx.runCommand
    ctx.runCommand = (...args) => {
      calls += 1
      return runCommand(...args)
    }
    expect(await findProfile(config, ctx)).toBeNull()
    expect(calls).toBe(1)
  })

  it('returns null outside a repository without path match', async () => {
    const plain = sandbox.dir('plain')
    const config = await load(
      { profiles: [{ name: 'work', remotes: ['gitlab.example.com'] }] },
      plain
    )
    const ctx = sandbox.ctx(plain, { GIT_CEILING_DIRECTORIES: sandbox.home })
    expect(await findProfile(config, ctx)).toBeNull()
  })
})
