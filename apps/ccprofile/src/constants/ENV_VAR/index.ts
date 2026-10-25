const ENV_VAR = {
  profile: 'CCPROFILE',
  account: 'CCPROFILE_ACCOUNT',
  config: 'CCPROFILE_CONFIG',
  argv: 'CCPROFILE_ARGV',
  claudeConfigDir: 'CLAUDE_CONFIG_DIR',
  codexHome: 'CODEX_HOME',
  // Set by Claude Code in its child processes: a nested `claude`.
  claudeCode: 'CLAUDECODE',
  xdgConfigHome: 'XDG_CONFIG_HOME',
  appData: 'APPDATA',
  shell: 'SHELL',
  zdotdir: 'ZDOTDIR',
} as const

export default ENV_VAR
