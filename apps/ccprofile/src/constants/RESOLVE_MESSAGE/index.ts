// Texts of `resolve`. Every line starts with `ccprofile: `; the lines that
// belong to one error message are continued with `ccprofile:   <detail>`.
const PREFIX = 'ccprofile:'

const RESOLVE_MESSAGE = {
  unknownProfile: (name: string) => `${PREFIX} unknown profile "${name}"`,
  invalidConfig: (path: string) => `${PREFIX} invalid config ${path}`,
  issue: (issue: string) => `${PREFIX}   ${issue}`,
  aborted: `${PREFIX} aborted`,
  usingOnUnknown: (name: string) =>
    `${PREFIX} no match, using "${name}" (onUnknown)\n`,
  promptHint: `${PREFIX} add a "paths" or "remotes" entry to skip this prompt\n`,
  creatingProfile: (name: string, dir: string) =>
    `${PREFIX} creating new profile "${name}" at ${dir}, first start will ask for login\n`,
} as const

export default RESOLVE_MESSAGE
