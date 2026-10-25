// The limit file format 1, shared by the mod test (`register.test.ts`: the
// mod writes exactly this) and ccprofile's Vitest suite
// (`tests/limits/readLimits`: ccprofile reads exactly this). Changing it
// breaks one side unless both move together.
const LIMITS_FIXTURE = {
  measuredAt: Date.UTC(2026, 9, 25, 12, 0, 0),
  // `session.measure`'s `rateLimits` as the engine delivers them.
  rateLimits: [
    {
      kind: 'five_hour',
      percentUsed: 42.5,
      resetsAt: '2026-10-25T14:30:00.000Z',
    },
    {
      kind: 'seven_day',
      percentUsed: 80,
      resetsAt: '2026-10-27T09:00:00.000Z',
    },
    { kind: 'spend_limit', percentUsed: 12 },
  ],
  file: {
    version: 1,
    seenAt: '2026-10-25T12:00:00.000Z',
    rateLimits: [
      {
        kind: 'five_hour',
        percentUsed: 42.5,
        resetsAt: '2026-10-25T14:30:00.000Z',
      },
      {
        kind: 'seven_day',
        percentUsed: 80,
        resetsAt: '2026-10-27T09:00:00.000Z',
      },
      { kind: 'spend_limit', percentUsed: 12 },
    ],
  },
} as const

export default LIMITS_FIXTURE
