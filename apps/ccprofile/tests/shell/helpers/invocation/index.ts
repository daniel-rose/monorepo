import type { Invocation } from '../../types'

// The expected report of one fake claude run; CCPROFILE_ARGV never reaches
// claude unless the session had it already. The account is empty for the
// first account (resolve leaves that field empty).
const invocation = (
  ccprofile: string,
  claudeConfigDir: string,
  args: string[] = [],
  ccprofileAccount = ''
): Invocation => ({
  ccprofile,
  ccprofileAccount,
  claudeConfigDir,
  ccprofileArgv: '',
  args,
})

export default invocation
