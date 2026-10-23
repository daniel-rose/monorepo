import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import createRunCommand from '../../../src/context/createRunCommand'
import readOriginUrl from '../../../src/match/readOriginUrl'
import createTestContext from '../../helpers/createTestContext'

let root = ''
let gitEnv: NodeJS.ProcessEnv = {}

// Git hooks export GIT_DIR, GIT_INDEX_FILE and friends. runCommand merges the
// given env over process.env, so those keys must be set to undefined (which
// removes them) or the fixtures would hit the surrounding repository.
const createGitEnv = (home: string): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {}
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('GIT_')) env[key] = undefined
  }
  return { ...env, HOME: home, GIT_CONFIG_NOSYSTEM: '1' }
}

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, {
    cwd,
    env: { ...process.env, ...gitEnv },
    stdio: 'ignore',
  })

const createContext = (cwd: string, env: NodeJS.ProcessEnv = gitEnv) =>
  createTestContext({ cwd, env, runCommand: createRunCommand('linux') })

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'ccprofile-origin-')))
  const home = join(root, 'home')
  mkdirSync(home)
  gitEnv = createGitEnv(home)
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('readOriginUrl', () => {
  it('returns the origin url of a repository', async () => {
    const repo = join(root, 'with-origin')
    mkdirSync(repo)
    git(repo, 'init', '-q')
    git(repo, 'remote', 'add', 'origin', 'git@github.com:jane/dotfiles.git')

    expect(await readOriginUrl(createContext(repo))).toBe(
      'git@github.com:jane/dotfiles.git'
    )
  })

  it('returns null outside a repository', async () => {
    const dir = join(root, 'plain')
    mkdirSync(dir)

    expect(
      await readOriginUrl(
        createContext(dir, { ...gitEnv, GIT_CEILING_DIRECTORIES: root })
      )
    ).toBeNull()
  })

  it('returns null for a repository without origin', async () => {
    const repo = join(root, 'no-origin')
    mkdirSync(repo)
    git(repo, 'init', '-q')

    expect(await readOriginUrl(createContext(repo))).toBeNull()
  })

  it('returns null when git is not on the PATH', async () => {
    const repo = join(root, 'no-git')
    mkdirSync(repo)
    const empty = join(root, 'empty-bin')
    mkdirSync(empty)

    expect(
      await readOriginUrl(createContext(repo, { ...gitEnv, PATH: empty }))
    ).toBeNull()
  })
})
