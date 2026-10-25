// Text pieces for limit data, shared by `resolve`, `status`, `list` and
// `doctor`. Times are local; a reset on another day carries the weekday.
const LIMITS_TEXT = {
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  window: (kind: string, percent: number) => `${kind} ${percent}%`,
  // `private five_hour 97% until 14:30`; several full windows joined by ` + `.
  skipped: (name: string, windows: readonly string[], until: string) =>
    `${name} ${windows.join(' + ')} until ${until}`,
  skippedSeparator: '; ',
  // Why the account is not the first one (resolve line and `status`); the
  // threshold counts as full.
  autoDetail: (threshold: number, skipped: string) =>
    `≥${threshold}%: ${skipped}`,
  allFullDetail: (threshold: number, freeAt: string) =>
    `all ≥${threshold}%, free at ${freeAt}`,
  // `list`: the short names of the subscription windows; others as named.
  shortKinds: { five_hour: '5h', seven_day: '7d' } as Readonly<
    Record<string, string>
  >,
  listWindowReset: (kind: string) => `${kind} reset`,
  listSeparator: ' · ',
  noData: 'no data',
  invalid: 'limits.json invalid',
  unsupported: (version: number) =>
    `limits.json version ${version} unsupported`,
} as const

export default LIMITS_TEXT
