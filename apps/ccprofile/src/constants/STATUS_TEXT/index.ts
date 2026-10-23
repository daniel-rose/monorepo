// Texts of `status` (spec §8). `list` shares the missing-config line.
const STATUS_TEXT = {
  explicitConfigDir: (value: string) => `explicit (CLAUDE_CONFIG_DIR=${value})`,
  explicitProfile: (name: string) => `explicit (CCPROFILE=${name})`,
  noProfiles: (path: string) => `no profiles configured (${path})`,
  willPrompt: 'no match (will prompt)',
  matched: (name: string, via: string, entry: string) =>
    `${name} (${via} ${entry})`,
  onUnknown: (name: string) => `${name} (onUnknown)`,
} as const

export default STATUS_TEXT
