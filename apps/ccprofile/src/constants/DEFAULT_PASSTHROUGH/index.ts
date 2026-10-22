// Arguments that go straight to `claude` without a profile.
const DEFAULT_PASSTHROUGH = [
  '--version',
  '-v',
  '--help',
  '-h',
  'update',
] as const

export default DEFAULT_PASSTHROUGH
