const OUTCOME_KIND = {
  unchanged: 'unchanged',
  profile: 'profile',
  noMatch: 'noMatch',
  // A profile applies, but it disables the tool (`codex: false`).
  disabled: 'disabled',
  error: 'error',
} as const

export default OUTCOME_KIND
