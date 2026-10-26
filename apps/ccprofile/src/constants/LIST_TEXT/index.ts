// Texts of `list` (spec §8).
const LIST_TEXT = {
  profile: (name: string) => `[${name}]`,
  configDir: (dir: string | undefined) =>
    `  configDir: ${dir ?? '~/.claude (default)'}`,
  sharedSource: (dir: string | undefined) =>
    `  shared source: ${dir ?? '~/.claude (default)'}`,
  // `dir` undefined: the first account of the default profile.
  account: (name: string, dir: string | undefined) =>
    `  account: ${name} (${dir ?? '~/.claude (default)'})`,
  // An account line with the last reading of its limit file.
  accountLimits: (line: string, reading: string) => `${line} – ${reading}`,
  codex: (dir: string | undefined) => `  codex: ${dir ?? '~/.codex (default)'}`,
  codexAccount: (name: string, dir: string) =>
    `  codex account: ${name} (${dir})`,
  codexFromProfile: 'from profile',
  codexDefault: '~/.codex (default)',
  remote: (entry: string) => `  remote: ${entry}`,
  path: (entry: string) => `  path: ${entry}`,
  onUnknown: (value: string) => `onUnknown: ${value}`,
  // `onUnknown: "prompt"` with a single profile never prompts.
  onUnknownOnlyProfile: (value: string, name: string) =>
    `onUnknown: ${value} (only profile "${name}" is used)`,
} as const

export default LIST_TEXT
