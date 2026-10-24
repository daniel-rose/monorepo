// What the shell does after loading the hook (scripts per shell in runHook):
// - call: `claude <args>`, exit with its status
// - capture: capture `claude <args>` into a variable, print it as
//   `CAPTURED<<…>>`
// - stdinRest: `claude <args>`, then print the unread stdin as `REST<<…>>`
//   (POSIX shells only)
// - strict: `claude` without arguments under `set -u` (zsh, bash) or
//   `Set-StrictMode -Version Latest` (PowerShell); fish has no such mode
// - twoDirs: `cd <arg 1>; claude; cd <arg 2>; claude`, then print the
//   session's CCPROFILE, CLAUDE_CONFIG_DIR and CCPROFILE_ARGV as `AFTER …`
// - codex: `codex <args>`, then print the session's CODEX_HOME as `AFTER …`
const SCENARIO = {
  call: 'call',
  codex: 'codex',
  capture: 'capture',
  stdinRest: 'stdinRest',
  strict: 'strict',
  twoDirs: 'twoDirs',
} as const

export default SCENARIO
