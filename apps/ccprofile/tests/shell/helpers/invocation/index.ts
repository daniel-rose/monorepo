import type { Invocation } from '../../types'

// The expected report of one fake claude run; CCPROFILE_ARGV never reaches
// claude unless the session had it already.
const invocation = (
  ccprofile: string,
  claudeConfigDir: string,
  args: string[] = []
): Invocation => ({ ccprofile, claudeConfigDir, ccprofileArgv: '', args })

export default invocation
