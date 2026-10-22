// Config of the shell tests. `work` is the default profile (no configDir);
// path entries use forward slashes on every platform.
const HOOK_CONFIG = {
  profiles: [
    { name: 'work', paths: ['~/Projects/work'] },
    {
      name: 'private',
      configDir: '~/.claude-private',
      paths: ['~/Projects/private'],
    },
    {
      name: 'unicode',
      configDir: '~/.claude-ü',
      paths: ['~/Projects/unicode'],
    },
  ],
} as const

export default HOOK_CONFIG
