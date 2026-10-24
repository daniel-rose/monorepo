// Reason texts of config issues (`<json.path>: <reason>`).
const CONFIG_REASON = {
  empty: 'must not be empty',
  unknownKey: 'unknown key',
  noProfiles: 'must contain at least one profile',
  badName: 'must match [A-Za-z0-9_.-]+',
  reservedName: '"prompt" is reserved',
  badOnUnknown: 'must be "prompt" or the name of a profile',
  multipleDefaults: 'only one profile may omit configDir',
  noMatchers: 'needs at least one entry in paths or remotes',
  lineControl: 'must not contain TAB or line breaks',
  notAbsolute: 'must be an absolute path',
  claudeHome: 'must not be ~/.claude (omit configDir for the default profile)',
  codexHome: 'must not be ~/.codex, the default (omit codex instead)',
  codexInClaudeHome: 'must not be ~/.claude',
  claudeInCodexHome: 'must not be ~/.codex',
  notDirectory: 'exists but is not a directory',
  noHost: 'has no host',
  accountIsProfile: 'must differ from the profile name',
} as const

export default CONFIG_REASON
