// Texts of `setup`. Messages carry no trailing newline.
const SETUP_TEXT = {
  shellRequiredOnWindows: (valid: readonly string[]) =>
    `ccprofile: shell argument required on Windows (${valid.join(', ')})`,
  shellNotDetected: (valid: readonly string[]) =>
    `ccprofile: cannot detect your shell from $SHELL – pass one (${valid.join(', ')})`,
  profileQueryFailed: (executable: string) =>
    `ccprofile: could not read the profile path from ${executable} – nothing written`,
  profileQueryTimedOut: (executable: string) =>
    `ccprofile: ${executable} did not return its profile path in time – nothing written`,
  malformed: (file: string, reason: string) =>
    `ccprofile: ${file}: ${reason} – fix it by hand, nothing written`,
  unsupportedEncoding: (file: string) =>
    `ccprofile: ${file}: unsupported encoding – convert it to UTF-8; nothing written`,
  changedMeanwhile: (file: string) =>
    `ccprofile: ${file} changed while waiting – run setup again; nothing written`,
  profileQueryInvalid: (executable: string, output: string) =>
    `ccprofile: ${executable} did not return a single absolute profile path (got ${JSON.stringify(output)}) – nothing written`,
  multipleBlocks: 'more than one ccprofile block',
  unmatchedMarker: 'unmatched ccprofile marker',
  cannotAccess: (file: string, reason: string) =>
    `ccprofile: cannot access ${file} (${reason}) – nothing written`,
  diffHeader: (file: string) => `--- ${file}`,
  writeLine: (file: string) => `write ${file}`,
  removeLine: (file: string) => `remove ${file}`,
  keptHook: (file: string, shell: string) =>
    `kept ${file} – still used by ${shell} profile`,
  applyPrompt: 'Apply these changes?',
  declined: 'ccprofile: nothing written',
  unchanged: 'ccprofile: nothing to change, already up to date (unchanged)',
  unchangedRemove: 'ccprofile: nothing to remove (unchanged)',
  done: (count: number) => `ccprofile: done, ${count} file(s) changed`,
  reload: 'open a new terminal (or reload your shell startup file) to apply it',
  bashProfileMissing:
    'ccprofile: warning: ~/.bash_profile does not exist; bash login shells (the default on macOS and Windows terminals) then read ~/.bash_login or else ~/.profile, never ~/.bashrc – add to that file: [ -n "$BASH_VERSION" ] && [ -f ~/.bashrc ] && . ~/.bashrc; if you create ~/.bash_profile instead, bash stops reading ~/.bash_login and ~/.profile, so also source the one you use from it, e.g. [ -f ~/.profile ] && . ~/.profile',
  bashProfileNoBashrc:
    'ccprofile: warning: ~/.bash_profile does not source ~/.bashrc; login shells will not load the hook – add: [ -f ~/.bashrc ] && source ~/.bashrc',
} as const

export default SETUP_TEXT
