import type { Invocation } from '../../types'

// The expected report of one fake claude run; CCPROFILE_ARGV never reaches
// claude unless the session had it already. The account defaults to the
// first one, which carries the profile name.
const invocation = (
  ccprofile: string,
  claudeConfigDir: string,
  args: string[] = [],
  ccprofileAccount: string = ccprofile
): Invocation => ({
  ccprofile,
  ccprofileAccount,
  claudeConfigDir,
  ccprofileArgv: '',
  args,
})

export default invocation
