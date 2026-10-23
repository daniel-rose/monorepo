// Fake `claude auth status --json`, driven by $FAKE_AUTH_MODE:
// loggedInEmail | loggedIn | loggedOut | sleep | garbage.
// Records whether CLAUDE_CONFIG_DIR was present in $FAKE_AUTH_LOG.
import { appendFileSync } from 'node:fs'

const mode = process.env.FAKE_AUTH_MODE ?? ''
const log = process.env.FAKE_AUTH_LOG ?? ''

if (log !== '') {
  const state =
    process.env.CLAUDE_CONFIG_DIR === undefined
      ? 'CLAUDE_CONFIG_DIR=absent'
      : `CLAUDE_CONFIG_DIR=${process.env.CLAUDE_CONFIG_DIR}`
  appendFileSync(log, `${state}\n`)
}

// `claude --version` (doctor's PATH check) is answered in every mode.
if (process.argv[2] === '--version') {
  process.stdout.write('2.1.0 (Claude Code)\n')
  process.exit(0)
}

const print = value => process.stdout.write(`${JSON.stringify(value)}\n`)

switch (mode) {
  case 'loggedInEmail':
    print({
      loggedIn: true,
      email: 'jane@example.test',
      subscriptionType: 'max',
    })
    break
  case 'loggedIn':
    print({ loggedIn: true })
    break
  case 'loggedOut':
    print({ loggedIn: false })
    process.exitCode = 1
    break
  case 'sleep':
    setTimeout(() => {}, 20_000)
    break
  default:
    process.stdout.write('not json at all\n')
}
