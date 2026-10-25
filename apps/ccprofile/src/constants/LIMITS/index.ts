// The limit file the ccprofile mod writes per account (spec §5):
// `<account configDir or ~/.claude>/ccprofile/limits.json`.
const LIMITS = {
  dirName: 'ccprofile',
  fileName: 'limits.json',
  // The format version this ccprofile reads; another one counts as no data.
  version: 1,
  // An account is full once any window is at or above it (percent).
  defaultThreshold: 90,
  minThreshold: 1,
  maxThreshold: 100,
  // The mod writes without rename: a read during its write may see half a
  // file, so a broken one is read once more after this pause.
  retryDelayMs: 10,
} as const

export default LIMITS
