// Texts of `list` (spec §8).
const LIST_TEXT = {
  profile: (name: string) => `[${name}]`,
  configDir: (dir: string | undefined) =>
    `  configDir: ${dir ?? '~/.claude (default)'}`,
  sharedSource: (dir: string | undefined) =>
    `  shared source: ${dir ?? '~/.claude (default)'}`,
  account: (name: string, dir: string) => `  account: ${name} (${dir})`,
  remote: (entry: string) => `  remote: ${entry}`,
  path: (entry: string) => `  path: ${entry}`,
  onUnknown: (value: string) => `onUnknown: ${value}`,
} as const

export default LIST_TEXT
