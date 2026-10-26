// Texts of `switch` and `handoff`. The reasons carry no prefix: `switch`
// fails with `error(reason)`, `handoff` warns with `skipped(reason)`.
const PREFIX = 'ccprofile:'

const SWITCH_TEXT = {
  error: (reason: string) => `${PREFIX} ${reason}`,
  noProfile: 'CCPROFILE is not set – start claude through the ccprofile hook',
  unusableConfig: (path: string) =>
    `config ${path} missing or invalid – run "ccprofile doctor"`,
  unknownProfile: (name: string) => `unknown profile "${name}"`,
  unknownAccount: (name: string, profile: string) =>
    `unknown account "${name}" in profile "${profile}"`,
  // `switch` without --json.
  target: (profile: string, account: string, target: string) =>
    `profile "${profile}": account "${account}" → "${target}"`,
  noTarget: (profile: string, account: string, reason: string) =>
    `profile "${profile}": account "${account}", no switch (${reason})`,
  noOther: (profile: string) => `profile "${profile}" has no other account`,
  allFull: (threshold: number, freeAt: string) =>
    `all other accounts ≥${threshold}%, free at ${freeAt}`,
  // `handoff`.
  resuming: (sessionId: string, account: string, profile: string) =>
    `${PREFIX} resuming session ${sessionId} as account "${account}" of profile "${profile}"\n`,
  skipped: (reason: string) => `${PREFIX} switch skipped (${reason})\n`,
  skippedWithSession: (reason: string, sessionId: string) =>
    `${PREFIX} switch skipped (${reason}) – resume by hand with "claude --resume ${sessionId}"\n`,
  unreadable: 'handoff file unreadable',
  invalid: 'handoff file invalid',
  unsupported: (version: number) =>
    `handoff file version ${version} unsupported`,
  otherProfile: (written: string, running: string) =>
    `written for profile "${written}", running "${running}"`,
  sameAccount: (name: string) => `already on account "${name}"`,
  invalidSessionId: 'invalid session id',
} as const

export default SWITCH_TEXT
