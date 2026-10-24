// Arguments that go straight to `codex` without a profile. Fixed, not
// configurable; matched like `passthrough`. `login` and `logout` are missing
// on purpose: they must land in the profile's CODEX_HOME.
const CODEX_PASSTHROUGH = [
  '--version',
  '-V',
  '--help',
  '-h',
  'help',
  'completion',
  'update',
] as const

export default CODEX_PASSTHROUGH
