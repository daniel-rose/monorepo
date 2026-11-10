// What `codex` gets in a profile: ~/.codex (no `codex` key), its own
// `codex.home`, or nothing at all (`codex: false`).
const CODEX_MODE = {
  default: 'default',
  home: 'home',
  disabled: 'disabled',
} as const

export default CODEX_MODE
