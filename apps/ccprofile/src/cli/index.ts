import { Command, CommanderError } from 'commander'

import type { ExitCode } from '../constants'
import { EXIT_CODE } from '../constants'
import readPackageVersion from '../context/readPackageVersion'
import type { Context } from '../context/types'

const COMMANDER_SUCCESS_CODES: readonly string[] = [
  'commander.helpDisplayed',
  'commander.version',
]

// No subcommands are registered yet, so commander itself would report "too many
// arguments"; subcommands registered later get commander's own message.
const createProgram = (ctx: Context): Command => {
  const program = new Command()
    .name('ccprofile')
    .version(readPackageVersion(), '-v, --version')
    .exitOverride()
    .configureOutput({
      writeOut: text => void ctx.stdout.write(text),
      writeErr: text => void ctx.stderr.write(text),
    })

  return program.argument('[command]').action((command?: string) => {
    if (command !== undefined) {
      program.error(`error: unknown command '${command}'`, {
        code: 'commander.unknownCommand',
      })
    }
  })
}

const run = async (
  argv: readonly string[],
  ctx: Context
): Promise<ExitCode> => {
  try {
    await createProgram(ctx).parseAsync([...argv], { from: 'user' })
    return EXIT_CODE.ok
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
