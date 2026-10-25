// Texts of `resolve`. Every line starts with `ccprofile: `; the lines that
// belong to one error message are continued with `ccprofile:   <detail>`.
const PREFIX = 'ccprofile:'

const RESOLVE_MESSAGE = {
  unknownProfile: (name: string) => `${PREFIX} unknown profile "${name}"`,
  unknownAccount: (name: string, profile: string) =>
    `${PREFIX} unknown account "${name}" in profile "${profile}"`,
  accountWithoutProfile: (name: string) =>
    `${PREFIX} CCPROFILE_ACCOUNT="${name}" is set, but no profile applies`,
  invalidConfig: (path: string) => `${PREFIX} invalid config ${path}`,
  issue: (issue: string) => `${PREFIX}   ${issue}`,
  aborted: `${PREFIX} aborted`,
  usingOnUnknown: (name: string) =>
    `${PREFIX} no match, using "${name}" (onUnknown)\n`,
  promptHint: `${PREFIX} add a "paths" or "remotes" entry to skip this prompt\n`,
  creatingProfile: (name: string, dir: string) =>
    `${PREFIX} creating new profile "${name}" at ${dir}, first start will ask for login\n`,
  creatingAccount: (name: string, profile: string, dir: string) =>
    `${PREFIX} creating new account "${name}" of profile "${profile}" at ${dir}, first start will ask for login – run "ccprofile link" to share the profile config\n`,
  // Automatic account choice (spec §5), only when the limit data led away
  // from the first account (or all accounts are full).
  accountChoice: (profile: string, account: string, detail: string) =>
    `${PREFIX} profile "${profile}" → account "${account}" (${detail})\n`,
  // Codex never creates its CODEX_HOME; `link` does.
  codexHomeMissing: (dir: string, account: string) =>
    `${PREFIX} codex home ${dir} of account "${account}" does not exist – run "ccprofile link"\n`,
} as const

export default RESOLVE_MESSAGE
