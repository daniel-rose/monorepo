// Texts of `setup`. Messages carry no trailing newline.
const SETUP_TEXT = {
  shellRequiredOnWindows: (valid: readonly string[]) =>
    `ccprofile: shell argument required on Windows (${valid.join(', ')})`,
  shellNotDetected: (valid: readonly string[]) =>
    `ccprofile: cannot detect your shell from $SHELL – pass one (${valid.join(', ')})`,
  profileQueryFailed: (executable: string) =>
    `ccprofile: could not read the profile path from ${executable} – nothing written`,
  malformed: (file: string, reason: string) =>
    `ccprofile: ${file}: ${reason} – fix it by hand, nothing written`,
  multipleBlocks: 'more than one ccprofile block',
  unmatchedMarker: 'unmatched ccprofile marker',
  cannotAccess: (file: string, reason: string) =>
    `ccprofile: cannot access ${file} (${reason}) – nothing written`,
  cannotWrite: (file: string, reason: string) =>
    `ccprofile: cannot write ${file} (${reason})`,
  diffHeader: (file: string) => `--- ${file}`,
  writeLine: (file: string) => `write ${file}`,
  removeLine: (file: string) => `remove ${file}`,
  applyPrompt: 'Apply these changes? [y/N] ',
  declined: 'ccprofile: nothing written',
  unchanged: 'ccprofile: nothing to change, already up to date (unchanged)',
  unchangedRemove: 'ccprofile: nothing to remove (unchanged)',
  done: (count: number) => `ccprofile: done, ${count} file(s) changed`,
  reload: 'open a new terminal (or reload your shell startup file) to apply it',
  bashProfileMissing:
    'ccprofile: warning: ~/.bash_profile does not exist; login shells (the default on macOS and Windows terminals) do not read ~/.bashrc – create it with: [ -f ~/.bashrc ] && source ~/.bashrc',
  bashProfileNoBashrc:
    'ccprofile: warning: ~/.bash_profile does not source ~/.bashrc; login shells will not load the hook – add: [ -f ~/.bashrc ] && source ~/.bashrc',
} as const

export default SETUP_TEXT
