// What `inspectEntry` finds for one shared entry: the source in the shared
// dir, and the target in the account dir.
const ENTRY_STATE = {
  source: {
    present: 'present',
    missing: 'missing',
    wrongKind: 'wrongKind',
  },
  target: {
    absent: 'absent',
    linked: 'linked',
    elsewhere: 'elsewhere',
    replaced: 'replaced',
  },
} as const

export default ENTRY_STATE
