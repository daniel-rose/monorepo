// Fake claude behind `claude.cmd` and `codex.cmd` on Windows (`node
// fake-claude.mjs %*`; the .cmd names the tool in FAKE_CLAUDE_TOOL). Same
// report as fake-claude.sh: stdout plus $FAKE_CLAUDE_LOG, exit code from
// $FAKE_CLAUDE_EXIT.
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'

const read = name => process.env[name] ?? ''

const report = [
  `CCPROFILE=${read('CCPROFILE')}`,
  `CCPROFILE_ACCOUNT=${read('CCPROFILE_ACCOUNT')}`,
  `CLAUDE_CONFIG_DIR=${read('CLAUDE_CONFIG_DIR')}`,
  `CODEX_HOME=${read('CODEX_HOME')}`,
  `CCPROFILE_ARGV=${read('CCPROFILE_ARGV')}`,
  `TOOL=${read('FAKE_CLAUDE_TOOL') || 'claude'}`,
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
// With FAKE_CLAUDE_HANDOFF, the first run writes it into the hook's handoff
// file, as the mod does at /exit after /ccprofile-switch, and keeps the
// file's path in $FAKE_CLAUDE_LOG.handoff.
const handoffMarker = `${read('FAKE_CLAUDE_LOG')}.handoff`
if (
  read('FAKE_CLAUDE_HANDOFF') !== '' &&
  read('CCPROFILE_HANDOFF') !== '' &&
  !existsSync(handoffMarker)
) {
  writeFileSync(read('CCPROFILE_HANDOFF'), read('FAKE_CLAUDE_HANDOFF'))
  writeFileSync(handoffMarker, read('CCPROFILE_HANDOFF'))
}
process.exitCode = Number(read('FAKE_CLAUDE_EXIT') || '0')
