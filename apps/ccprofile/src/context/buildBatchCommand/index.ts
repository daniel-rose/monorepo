import isSafeShellArgs from '../isSafeShellArgs'

type BatchCommandInput = {
  executable: string
  args: readonly string[]
  comSpec: string | undefined
}

// cmd.exe expands %VAR% even inside quotes and a quote ends the quoting.
const UNQUOTABLE_PATH = /["%]/

// Node refuses to spawn .cmd/.bat directly (CVE-2024-27980), and passing an
// args array together with `shell: true` is deprecated (DEP0190). So the
// command line is built here and handed to cmd.exe: `/s` strips the outer pair
// of quotes, leaving `"<executable>" <args>`. Spawn the result with
// `windowsVerbatimArguments`. null: cmd.exe would re-parse something in it, so
// only plain arguments (and an executable path without % or ") are let
// through.
const buildBatchCommand = ({
  executable,
  args,
  comSpec,
}: BatchCommandInput): { file: string; args: string[] } | null => {
  if (UNQUOTABLE_PATH.test(executable) || !isSafeShellArgs(args)) {
    return null
  }

  return {
    file: comSpec ?? 'cmd.exe',
    args: ['/d', '/s', '/c', `"${[`"${executable}"`, ...args].join(' ')}"`],
  }
}

export default buildBatchCommand
