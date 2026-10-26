// `/ccprofile-switch` (spec §6): the mod asks `ccprofile switch --json`
// for the target, and at /exit writes the handoff the hook v4 follows. The
// formats are ccprofile's (`src/constants/SWITCH`); the mod cannot import
// from there.
const SWITCH = {
  commandName: 'ccprofile-switch',
  offArgument: 'off',
  planArgv: ['ccprofile', 'switch', '--json'],
  planVersion: 1,
  handoffVersion: 1,
  // The `session.end` reason of /exit, ctrl+c and ctrl+d: the shell hook
  // runs next. Every other end (/clear, /resume, logout, signal) drops the
  // switch.
  interactiveExit: 'prompt_input_exit',
  planTimeoutMs: 10_000,
  // How ccprofile starts its messages; dropped from an error it passes on,
  // as the engine names the plugin already.
  cliPrefix: 'ccprofile: ',
} as const

export default SWITCH
