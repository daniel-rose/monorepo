// Fake claude behind `claude.cmd` on Windows (`node fake-claude.mjs %*`).
// Same report as fake-claude.sh: stdout plus $FAKE_CLAUDE_LOG, exit code from
// $FAKE_CLAUDE_EXIT.
import { appendFileSync, writeFileSync } from 'node:fs'

const read = name => process.env[name] ?? ''

const report = [
  `CCPROFILE=${read('CCPROFILE')}`,
  `CLAUDE_CONFIG_DIR=${read('CLAUDE_CONFIG_DIR')}`,
  `CCPROFILE_ARGV=${read('CCPROFILE_ARGV')}`,
  ...process.argv.slice(2).map(arg => `ARG<<${arg}>>`),
]
  .map(line => `${line}\n`)
  .join('')

process.stdout.write(report)
if (read('FAKE_CLAUDE_LOG') !== '') {
  appendFileSync(read('FAKE_CLAUDE_LOG'), report)
  // The whole environment of the last run, for leak checks.
  writeFileSync(
    `${read('FAKE_CLAUDE_LOG')}.env`,
    Object.entries(process.env)
      .map(([key, value]) => `${key}=${value}\n`)
      .join('')
  )
}
process.exitCode = Number(read('FAKE_CLAUDE_EXIT') || '0')
