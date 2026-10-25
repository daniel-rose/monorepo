// The limit file ccprofile reads (`src/limits/readLimits`):
// `<CLAUDE_CONFIG_DIR or ~/.claude>/ccprofile/limits.json`. The mod cannot
// import from ccprofile; `tests/limits.fixture.ts` pins the format on both
// sides.
const LIMITS_FILE = {
  dirName: 'ccprofile',
  fileName: 'limits.json',
  version: 1,
  claudeDirName: '.claude',
} as const

export default LIMITS_FILE
