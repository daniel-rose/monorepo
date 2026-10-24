// Config of the shell tests. `work` is the default profile (no configDir,
// no codex: ~/.codex); path entries use forward slashes on every platform.
// `work` and `private` have a second account each; `private` and its
// `seat-2` have their own Codex homes.
const HOOK_CONFIG = {
  profiles: [
    {
      name: 'work',
      paths: ['~/Projects/work'],
      accounts: [{ name: 'work-2', configDir: '~/.claude-work-2' }],
    },
    {
      name: 'private',
      configDir: '~/.claude-private',
      codex: { home: '~/.codex-private' },
      paths: ['~/Projects/private'],
      accounts: [
        {
          name: 'seat-2',
          configDir: '~/.claude-private-2',
          codex: { home: '~/.codex-private-2' },
        },
      ],
    },
    {
      name: 'unicode',
      configDir: '~/.claude-ü',
      paths: ['~/Projects/unicode'],
    },
  ],
} as const

export default HOOK_CONFIG
