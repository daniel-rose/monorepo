import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import createRunCommand from '../../../src/context/createRunCommand'
import createTestContext from '../createTestContext'

const RM_MAX_RETRIES = 10
const RM_RETRY_DELAY_MS = 200

// Windows releases handles of just-ended processes (and Defender scans) a
// moment late; rmSync retries EBUSY, EPERM and friends.
const removeTree = (path: string): void =>
  rmSync(path, {
    recursive: true,
    force: true,
    maxRetries: RM_MAX_RETRIES,
    retryDelay: RM_RETRY_DELAY_MS,
  })

// Git hooks export GIT_DIR, GIT_INDEX_FILE and friends. runCommand merges the
// given env over process.env, so those keys are set to undefined (which removes
// them) or the fixtures would hit the surrounding repository.
const createBaseEnv = (home: string): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {}
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('GIT_')) env[key] = undefined
  }
  return {
    ...env,
    HOME: home,
    GIT_CONFIG_NOSYSTEM: '1',
    // Keep the host's variables out of the resolve run.
    CLAUDE_CONFIG_DIR: undefined,
    CCPROFILE: undefined,
    CCPROFILE_CONFIG: undefined,
    XDG_CONFIG_HOME: undefined,
  }
}

const runGit = (env: NodeJS.ProcessEnv, cwd: string, ...args: string[]) =>
  execFileSync('git', args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'ignore',
  })

const createSandbox = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'ccprofile-sandbox-')))
  const home = join(root, 'home')
  mkdirSync(home)
  const baseEnv = createBaseEnv(home)

  const dir = (name: string): string => {
    const path = join(home, name)
    mkdirSync(path, { recursive: true })
    return path
  }

  return Promise.resolve({
    home,
    dir,
    // Creates a git repository (and missing parents), optionally with origin.
    repo: (name: string, origin?: string): Promise<string> => {
      const path = dir(name)
      runGit(baseEnv, path, 'init', '-q')
      if (origin !== undefined) {
        runGit(baseEnv, path, 'remote', 'add', 'origin', origin)
      }
      return Promise.resolve(path)
    },
    writeConfig: (config: unknown): Promise<void> => {
      const path = join(home, '.config', 'ccprofile', 'config.json')
      mkdirSync(dirname(path), { recursive: true })
      const text = typeof config === 'string' ? config : JSON.stringify(config)
      writeFileSync(path, text)
      return Promise.resolve()
    },
    ctx: (cwd: string, env: Record<string, string> = {}) =>
      createTestContext({
        cwd,
        homedir: home,
        env: { ...baseEnv, ...env },
        platform: process.platform,
        runCommand: createRunCommand(process.platform),
      }),
    cleanup: (): Promise<void> => {
      removeTree(root)
      return Promise.resolve()
    },
  })
}

export default createSandbox
