import { SAFE_SHELL_ARG_PATTERN } from '../../constants'

const isSafeShellArgs = (args: readonly string[]): boolean =>
  args.every(arg => SAFE_SHELL_ARG_PATTERN.test(arg))

export default isSafeShellArgs
