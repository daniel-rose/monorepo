// Why `resolve` decided as it did (spec §3, in decision order).
const RESOLVE_REASON = {
  explicitConfigDir: 'explicitConfigDir',
  explicitCodexHome: 'explicitCodexHome',
  passthrough: 'passthrough',
  noConfig: 'noConfig',
  explicitProfile: 'explicitProfile',
  match: 'match',
  onUnknown: 'onUnknown',
  onlyProfile: 'onlyProfile',
  prompt: 'prompt',
} as const

export default RESOLVE_REASON
