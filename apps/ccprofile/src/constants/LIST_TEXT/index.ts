// Texts of `list` (spec §8).
const LIST_TEXT = {
  profile: (name: string) => `[${name}]`,
  configDir: (dir: string | undefined) =>
    `  configDir: ${dir ?? '~/.claude (default)'}`,
  remote: (entry: string) => `  remote: ${entry}`,
  path: (entry: string) => `  path: ${entry}`,
  onUnknown: (value: string) => `onUnknown: ${value}`,
} as const

export default LIST_TEXT
