// Texts of the interactive profile selection (spec §7).
const PROFILE_PROMPT_TEXT = {
  message: 'No Claude profile matches this directory, start with',
  configDir: (dir: string | undefined) => dir ?? '~/.claude (default)',
  // Only for profiles with accounts; `names` starts with the profile itself.
  withAccounts: (dir: string, names: readonly string[]) =>
    `${dir}, accounts: ${names.join(', ')}`,
} as const

export default PROFILE_PROMPT_TEXT
