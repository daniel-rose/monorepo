// The switch formats 1, shared by the mod test (`switch.test.ts`) and
// ccprofile's Vitest suite (`tests/cli/commands/switch`, `.../handoff`):
// `plan` is the line `ccprofile switch --json` prints and the mod reads,
// `handoff` the file the mod writes and `ccprofile handoff` reads. Changing
// one breaks a side unless both move together.
const SWITCH_FIXTURE = {
  plan: {
    version: 1,
    profile: 'private',
    account: 'private',
    threshold: 90,
    target: 'seat-2',
  },
  handoff: {
    version: 1,
    profile: 'private',
    account: 'seat-2',
    sessionId: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  },
} as const

export default SWITCH_FIXTURE
