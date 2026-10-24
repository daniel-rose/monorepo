// Where the CODEX_HOME of an account comes from: its own `codex.home`, the
// `codex.home` of its profile, or none (~/.codex).
const CODEX_HOME_SOURCE = {
  own: 'own',
  profile: 'profile',
  default: 'default',
} as const

export default CODEX_HOME_SOURCE
