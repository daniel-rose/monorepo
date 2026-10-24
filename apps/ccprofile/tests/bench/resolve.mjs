// Startup benchmark for `ccprofile resolve`: one warm-up run, then RUNS timed
// runs in a sandbox (temp HOME, temp git repo with an origin, temp config).
// Prints the median in ms. Informational only: there is no threshold.
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
import { fileURLToPath } from 'node:url'

const RUNS = 20
const NS_PER_MS = 1_000_000
const ENTRY = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'dist',
  'index.js'
)

const root = realpathSync(mkdtempSync(join(tmpdir(), 'ccprofile-bench-')))

try {
  const home = join(root, 'home')
  const repo = join(home, 'work', 'app')
  mkdirSync(repo, { recursive: true })
  const configPath = join(root, 'config.json')
  writeFileSync(
    configPath,
    JSON.stringify({
      profiles: [
        { name: 'work', remotes: ['gitlab.example.com', 'github.com/acme'] },
        {
          name: 'private',
          configDir: join(home, '.claude-private'),
          remotes: ['github.com/jane'],
        },
      ],
    })
  )

  // Git hooks export GIT_DIR and friends; they must not reach the sandbox.
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_')) delete env[key]
  }
  Object.assign(env, {
    HOME: home,
    USERPROFILE: home,
    GIT_CONFIG_NOSYSTEM: '1',
    CCPROFILE_CONFIG: configPath,
  })
  delete env.CLAUDE_CONFIG_DIR
  delete env.CCPROFILE
  delete env.CCPROFILE_ARGV
  delete env.XDG_CONFIG_HOME

  const git = (...args) =>
    execFileSync('git', args, { cwd: repo, env, stdio: 'ignore' })
  git('init', '-q')
  git('remote', 'add', 'origin', 'git@gitlab.example.com:acme/app.git')

  const resolve = () =>
    execFileSync(
      process.execPath,
      [ENTRY, 'resolve', '--protocol', '2', '--', '-p', 'hi'],
      {
        cwd: repo,
        env,
        stdio: ['ignore', 'pipe', 'inherit'],
      }
    )

  resolve()
  const timings = []
  for (let run = 0; run < RUNS; run += 1) {
    const start = process.hrtime.bigint()
    resolve()
    timings.push(Number(process.hrtime.bigint() - start) / NS_PER_MS)
  }
  timings.sort((a, b) => a - b)
  const middle = Math.floor(timings.length / 2)
  const median =
    timings.length % 2 === 0
      ? (timings[middle - 1] + timings[middle]) / 2
      : timings[middle]
  process.stdout.write(
    `resolve median over ${RUNS} runs: ${median.toFixed(1)} ms\n`
  )
} finally {
  rmSync(root, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200,
  })
}
