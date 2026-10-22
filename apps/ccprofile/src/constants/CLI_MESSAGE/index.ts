// Texts of the CLI itself. Errors carry no trailing newline.
const CLI_MESSAGE = {
  unknownCommand: (name: string) => `error: unknown command '${name}'`,
  noMatch: (configPath: string) =>
    `ccprofile: no profile matches and no interactive input is available – set "onUnknown" in ${configPath} or run CCPROFILE=<name> claude`,
  invalidArgv: (reason: string) =>
    `ccprofile: invalid CCPROFILE_ARGV (${reason})`,
  argvNotJson: 'not valid JSON',
  argvNotStringArray: 'not an array of strings',
} as const

export default CLI_MESSAGE
