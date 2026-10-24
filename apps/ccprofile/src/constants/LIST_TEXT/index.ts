// Texts of `list` (spec §8).
const LIST_TEXT = {
  profile: (name: string) => `[${name}]`,
  configDir: (dir: string | undefined) =>
    `  configDir: ${dir ?? '~/.claude (default)'}`,
  sharedSource: (dir: string | undefined) =>
    `  shared source: ${dir ?? '~/.claude (default)'}`,
  account: (name: string, dir: string) => `  account: ${name} (${dir})`,
  codex: (dir: string | undefined) => `  codex: ${dir ?? '~/.codex (default)'}`,
  codexAccount: (name: string, dir: string) =>
    `  codex account: ${name} (${dir})`,
  codexFromProfile: 'from profile',
  codexDefault: '~/.codex (default)',
  remote: (entry: string) => `  remote: ${entry}`,
  path: (entry: string) => `  path: ${entry}`,
  onUnknown: (value: string) => `onUnknown: ${value}`,
} as const

export default LIST_TEXT
