// Texts of `init`. Prompts end with a space, messages carry no newline.
const INIT_TEXT = {
  exists: (path: string) => `${path} already exists, not overwriting`,
  needsTerminal:
    'ccprofile: init needs a terminal – run it in one or use `ccprofile init --example`',
  noCandidates:
    'ccprofile: no Claude config directories found in your home – use `ccprofile init --example`',
  aborted: 'ccprofile: aborted, nothing written',
  invalidConfig: 'ccprofile: generated config is invalid, nothing written',
  writeFailed: (path: string, reason: string) =>
    `ccprofile: cannot write ${path} (${reason})`,
  wrote: (path: string) => `wrote ${path}`,
  candidate: (label: string, auth: string) => `${label}: ${auth}`,
  defaultLabel: '~/.claude (default)',
  loggedIn: 'logged in',
  loggedInAs: (details: string) => `logged in as ${details}`,
  loggedOut: 'not logged in',
  unknown: (reason: string) => `login state unknown (${reason})`,
  candidatesPrompt: 'Which config directories become profiles?',
  namePrompt: (label: string) => `Profile name for ${label}`,
  badName: (name: string) => `"${name}" is reserved, duplicate or invalid`,
  matcherPrompt: (name: string, required: boolean) =>
    `Remotes or paths for ${name}, comma-separated${required ? '' : ' (optional)'}`,
  matcherRequired: 'at least one remote or path is required',
  badPath: (entry: string) =>
    `"${entry}" is not an absolute path (use ~/… or a full path)`,
  badRemote: (entry: string) =>
    `"${entry}" is not a git remote (use host or host/namespace)`,
  onUnknownPrompt: 'When nothing matches',
  askEveryTime: 'ask every time',
  useProfile: (name: string) => `use ${name}`,
} as const

export default INIT_TEXT
