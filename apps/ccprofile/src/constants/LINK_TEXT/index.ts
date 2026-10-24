// Texts of `link` and the shared-entry states `doctor` reports. Messages
// carry no trailing newline.
const LINK_TEXT = {
  header: (profile: string, account: string, dir: string) =>
    `[${profile}] account ${account} (${dir})`,
  mkdir: (dir: string) => `  mkdir ${dir}`,
  create: (target: string, source: string) => `  link ${target} -> ${source}`,
  noSource: (target: string) => `  skip ${target} (no source)`,
  conflict: (target: string, reason: string) =>
    `  conflict ${target}: ${reason}`,
  unsupported: (target: string) =>
    `  unsupported ${target} (enable Developer Mode)`,
  failed: (target: string, reason: string) => `  failed ${target}: ${reason}`,
  replacedFile: 'replaced by a file',
  replacedDirectory: 'replaced by a directory',
  pointsElsewhere: (to: string) => `points elsewhere (${to})`,
  sourceWrongKind: (source: string, kind: string) =>
    `source ${source} is not a ${kind}`,
  applyPrompt: 'Create these links? [y/N] ',
  declined: 'ccprofile: nothing written',
  unchanged: 'ccprofile: nothing to change',
  done: (count: number) => `ccprofile: done, ${count} link(s) created`,
  noAccounts: 'ccprofile: no accounts configured',
  conflictHint:
    'ccprofile: conflicts left alone – merge the content into the source, delete the entry in the account dir, run "ccprofile link" again',
} as const

export default LINK_TEXT
