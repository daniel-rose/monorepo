// The CLIs ccprofile starts with a profile. Each has its own hook function
// and its own dir variable; `resolve --tool` names one.
const TOOL = {
  claude: 'claude',
  codex: 'codex',
} as const

export default TOOL
