import type { Invocation } from '../../types'

// The stdout of one fake claude run, as the fakes print it.
const formatReport = (invocation: Invocation): string =>
  [
    `CCPROFILE=${invocation.ccprofile}`,
    `CLAUDE_CONFIG_DIR=${invocation.claudeConfigDir}`,
    `CCPROFILE_ARGV=${invocation.ccprofileArgv}`,
    ...invocation.args.map(arg => `ARG<<${arg}>>`),
  ]
    .map(line => `${line}\n`)
    .join('')

export default formatReport
