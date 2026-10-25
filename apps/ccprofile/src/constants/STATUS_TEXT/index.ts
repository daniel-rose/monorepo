// Texts of `status` (spec §8). `list` shares the missing-config line.
const STATUS_TEXT = {
  explicitConfigDir: (value: string) => `explicit (CLAUDE_CONFIG_DIR=${value})`,
  explicitProfile: (name: string) => `explicit (CCPROFILE=${name})`,
  noProfiles: (path: string) => `no profiles configured (${path})`,
  willPrompt: 'no match (will prompt)',
  matched: (name: string, via: string, entry: string) =>
    `${name} (${via} ${entry})`,
  onUnknown: (name: string) => `${name} (onUnknown)`,
  // `detail`: CCPROFILE_ACCOUNT, or why the limit data chose this account.
  account: (name: string, detail: string | undefined) =>
    `, account ${name}${detail === undefined ? '' : ` (${detail})`}`,
  // The second line, for `codex` (spec §4.3, P16).
  codex: (dir: string) => `codex: ${dir}`,
  codexFromProfile: (dir: string) => `codex: ${dir} (from profile)`,
  codexDefault: 'codex: ~/.codex (default)',
  codexExplicit: (value: string) => `codex: explicit (CODEX_HOME=${value})`,
} as const

export default STATUS_TEXT
