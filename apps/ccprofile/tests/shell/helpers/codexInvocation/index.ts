import type { Invocation } from '../../types'

// The expected report of one fake codex run: CODEX_HOME instead of
// CLAUDE_CONFIG_DIR, never an --mcp-config.
const codexInvocation = (
  ccprofile: string,
  codexHome: string,
  args: string[] = [],
  ccprofileAccount = ''
): Invocation => ({
  ccprofile,
  ccprofileAccount,
  claudeConfigDir: '',
  codexHome,
  ccprofileArgv: '',
  tool: 'codex',
  args,
})

export default codexInvocation
