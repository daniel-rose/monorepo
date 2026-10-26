// Texts of `/ccprofile-switch` and its toast. The engine shows a command's
// answer under the plugin's name (`ccprofile: …`), so the command texts carry
// no prefix of their own; a toast does.
const SWITCH_TEXT = {
  description: 'Continue this session on another account of the profile',
  argumentHint: '[off]',
  noHook:
    'start claude through the ccprofile hook v4 to switch accounts (run "ccprofile setup")',
  nested: 'no switch in a claude started inside another claude session',
  planFailed: '"ccprofile switch" failed – is ccprofile on the PATH?',
  noTarget: (reason: string) => `no switch – ${reason}`,
  armed: (target: string, profile: string) =>
    `after /exit this session continues as account "${target}" of profile "${profile}". If "${target}" is in another organization, Claude cannot reuse the earlier thinking there (slower, more tokens). "/ccprofile-switch off" cancels.`,
  cancelled: 'switch cancelled',
  notArmed: 'no switch pending',
  offer: (kind: string, percent: number, target: string) =>
    `ccprofile: ${kind} at ${percent}% – /ccprofile-switch continues this session as account "${target}"`,
} as const

export default SWITCH_TEXT
