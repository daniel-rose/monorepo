const DOCTOR_PATTERN = {
  // First line of every hook file: `# ccprofile hook v<HOOK_VERSION>`.
  hookVersion: /^# ccprofile hook v(\d+)/m,
  // `…/@daniel-rose/ccprofile@<major>/schema.json` (unpkg-style `$schema`).
  schemaMajor: /@daniel-rose\/ccprofile@(\d+)(?=[/#?]|$)/,
  // The prefix `setup` puts on its warnings; doctor prints its own status.
  setupWarningPrefix: /^ccprofile: warning: /,
} as const

export default DOCTOR_PATTERN
