import { Command, CommanderError } from 'commander'

import type { ExitCode } from '../constants'
import { CLI_MESSAGE, EXIT_CODE } from '../constants'
import readPackageVersion from '../context/readPackageVersion'
import type { Context } from '../context/types'
import config from './commands/config'
import doctor from './commands/doctor'
import hook from './commands/hook'
import init from './commands/init'
import list from './commands/list'
import resolve from './commands/resolve'
import type { ResolveCommandOptions } from './commands/resolve/types'
import setup from './commands/setup'
import status from './commands/status'

const COMMANDER_SUCCESS_CODES: readonly string[] = [
  'commander.helpDisplayed',
  'commander.version',
]

type SetExitCode = (code: ExitCode) => void

const registerCommands = (
  program: Command,
  ctx: Context,
  setExitCode: SetExitCode
): void => {
  program
    .command('status')
    .description('show which profile claude would use here and why')
    .action(async () => setExitCode(await status(ctx)))

  program
    .command('list')
    .description('list the configured profiles')
    .action(async () => setExitCode(await list(ctx)))

  program
    .command('config')
    .description('print the config file path')
    .action(async () => setExitCode(await config(ctx)))

  program
    .command('hook')
    .description('print the shell hook (zsh, bash, fish, pwsh, powershell)')
    .argument('<shell>', 'shell to print the hook for')
    .action(async (shell: string) => setExitCode(await hook(ctx, shell)))

  program
    .command('init')
    .description('create the config file (wizard, or the example)')
    .option('--example', 'write the example config without asking')
    .action(async (options: { example?: boolean }) =>
      setExitCode(await init(ctx, options))
    )

  program
    .command('setup')
    .description('install the shell hook and wire it into your shell startup')
    .argument(
      '[shell]',
      'zsh, bash, fish, pwsh or powershell (default: $SHELL)'
    )
    .option('--yes', 'apply without asking')
    .option(
      '--remove',
      'remove the hook and its startup entry (keeps the config)'
    )
    .action(
      async (
        shell: string | undefined,
        options: { yes?: boolean; remove?: boolean }
      ) => setExitCode(await setup(ctx, shell, options))
    )

  program
    .command('doctor')
    .description('check config, claude, logins and hook installation')
    .action(async () => setExitCode(await doctor(ctx)))

  // Used by the shell hooks: everything after the first `--` belongs to
  // claude, including `-h` and `-v`, so commander must not interpret it.
  program
    .command('resolve')
    .description('print the profile for claude arguments (used by the hooks)')
    .argument('[args...]', 'claude arguments, after --')
    .option('--protocol <version>', 'line format the hook reads')
    .helpOption(false)
    .allowUnknownOption()
    .passThroughOptions()
    .action(async (args: string[], options: ResolveCommandOptions) =>
      setExitCode(await resolve(ctx, args, options))
    )
}

// Without a subcommand the root action runs `status`. It is not commander's
// `isDefault`, so a mistyped command still fails; excess arguments are allowed
// only so that this action can report them as "unknown command" instead of
// commander's "too many arguments".
const createProgram = (ctx: Context, setExitCode: SetExitCode): Command => {
  const program = new Command()
    .name('ccprofile')
    .version(readPackageVersion(), '-v, --version')
    .enablePositionalOptions()
    .allowExcessArguments()
    .exitOverride()
    .configureOutput({
      writeOut: text => void ctx.stdout.write(text),
      writeErr: text => void ctx.stderr.write(text),
    })
    .action(async () => {
      const [unknown] = program.args
      if (unknown !== undefined) {
        program.error(CLI_MESSAGE.unknownCommand(unknown), {
          code: 'commander.unknownCommand',
        })
      }
      setExitCode(await status(ctx))
    })

  registerCommands(program, ctx, setExitCode)
  return program
}

const run = async (
  argv: readonly string[],
  ctx: Context
): Promise<ExitCode> => {
  let exitCode: ExitCode = EXIT_CODE.ok
  try {
    await createProgram(ctx, code => {
      exitCode = code
    }).parseAsync([...argv], { from: 'user' })
    return exitCode
  } catch (error) {
    if (error instanceof CommanderError) {
      return COMMANDER_SUCCESS_CODES.includes(error.code)
        ? EXIT_CODE.ok
        : EXIT_CODE.failure
    }
    throw error
  }
}

export default run
