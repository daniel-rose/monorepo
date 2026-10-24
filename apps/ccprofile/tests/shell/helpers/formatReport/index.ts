import type { Invocation } from '../../types'

// The stdout of one fake claude run, as the fakes print it.
const formatReport = (invocation: Invocation): string =>
  [
    `CCPROFILE=${invocation.ccprofile}`,
    `CCPROFILE_ACCOUNT=${invocation.ccprofileAccount}`,
    `CLAUDE_CONFIG_DIR=${invocation.claudeConfigDir}`,
    `CODEX_HOME=${invocation.codexHome}`,
    `CCPROFILE_ARGV=${invocation.ccprofileArgv}`,
    `TOOL=${invocation.tool}`,
    ...invocation.args.map(arg => `ARG<<${arg}>>`),
  ]
    .map(line => `${line}\n`)
    .join('')

export default formatReport
