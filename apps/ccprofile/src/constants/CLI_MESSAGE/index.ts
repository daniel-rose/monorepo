// Texts of the CLI itself. Errors carry no trailing newline.
const CLI_MESSAGE = {
  unknownCommand: (name: string) => `error: unknown command '${name}'`,
  noMatch: (configPath: string) =>
    `ccprofile: no profile matches and no interactive input is available – set "onUnknown" in ${configPath} or run CCPROFILE=<name> claude`,
  invalidArgv: (reason: string) =>
    `ccprofile: invalid CCPROFILE_ARGV (${reason})`,
  hookOutdated: 'ccprofile: hook outdated – run "ccprofile setup"',
  unsupportedProtocol: (version: string) =>
    `ccprofile: unsupported protocol "${version}" – run "ccprofile setup"`,
  argvNotJson: 'not valid JSON',
  argvNotStringArray: 'not an array of strings',
  unknownShell: (name: string, valid: readonly string[]) =>
    `ccprofile: unknown shell "${name}" (valid: ${valid.join(', ')})`,
} as const

export default CLI_MESSAGE
