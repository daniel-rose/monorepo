// What the shell does after loading the hook (scripts per shell in runHook):
// - call: `claude <args>`, exit with its status
// - capture: capture `claude <args>` into a variable, print it as
//   `CAPTURED<<…>>`
// - stdinRest: `claude <args>`, then print the unread stdin as `REST<<…>>`
//   (POSIX shells only)
// - twoDirs: `cd <arg 1>; claude; cd <arg 2>; claude`, then print the
//   session's CCPROFILE, CLAUDE_CONFIG_DIR and CCPROFILE_ARGV as `AFTER …`
const SCENARIO = {
  call: 'call',
  capture: 'capture',
  stdinRest: 'stdinRest',
  twoDirs: 'twoDirs',
} as const

export default SCENARIO
