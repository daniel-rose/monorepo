import { CLI_MESSAGE, ENV_VAR } from '../../../../constants'
import type { Context } from '../../../../context/types'
import type { ParsedArgv } from './types'

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string')

// The PowerShell hook hands over the claude arguments as a JSON array in
// CCPROFILE_ARGV because the npm shims drop `--` and empty strings (spec §4).
// Arguments on the command line win; an empty value counts as unset.
const parseArgv = (ctx: Context, args: readonly string[]): ParsedArgv => {
  const raw = ctx.env[ENV_VAR.argv]
  if (args.length > 0 || raw === undefined || raw === '') return { args }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { error: CLI_MESSAGE.invalidArgv(CLI_MESSAGE.argvNotJson) }
  }
  return isStringArray(parsed)
    ? { args: parsed }
    : { error: CLI_MESSAGE.invalidArgv(CLI_MESSAGE.argvNotStringArray) }
}

export default parseArgv
