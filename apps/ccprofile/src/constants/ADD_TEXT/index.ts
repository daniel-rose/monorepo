// Texts of `add`. Prompts carry no trailing space, messages no newline.
const ADD_TEXT = {
  needsTerminal: 'ccprofile: add needs a terminal – run it in one',
  noConfig: (path: string) =>
    `ccprofile: no config at ${path} – create one with \`ccprofile init\``,
  badName: (name: string) =>
    `ccprofile: "${name}" is reserved, already a profile or invalid`,
  namePrompt: 'Name of the new profile',
  claudePrompt: (name: string) => `Claude config directory for ${name}`,
  existingDir: (label: string, auth: string) => `${label}: ${auth}`,
  defaultDir: '~/.claude (default)',
  newDir: 'new directory',
  newDirHint: 'created now, the first start asks for the login',
  dirPrompt: (name: string) => `New Claude config directory for ${name}`,
  positionPrompt: 'Where in the list? The first matching profile wins',
  before: (name: string) => `before ${name}`,
  atEnd: 'at the end',
  invalidConfig: 'ccprofile: the new config would be invalid, nothing written',
  diffHeader: (path: string) => `changes to ${path}:`,
  applyPrompt: 'Write the new profile?',
  declined: 'ccprofile: nothing written',
  aborted: 'ccprofile: aborted, nothing written',
  changedMeanwhile: (path: string) =>
    `ccprofile: ${path} changed meanwhile, nothing written – run add again`,
  writeFailed: (path: string, reason: string) =>
    `ccprofile: cannot write ${path} (${reason})`,
  createFailed: (dir: string, reason: string) =>
    `ccprofile: cannot create ${dir} (${reason}), nothing written`,
  // Directories created before a failure stay; they are empty.
  leftDirs: (dirs: readonly string[]) =>
    `ccprofile: created ${dirs.join(', ')} – empty, remove it if not needed`,
  created: (dir: string) => `created ${dir}`,
  wrote: (path: string) => `wrote ${path}`,
  loginClaude: (name: string) =>
    `log in to claude: CCPROFILE=${name} claude, then /login`,
  loginCodex: (name: string) =>
    `log in to codex: CCPROFILE=${name} codex login`,
} as const

export default ADD_TEXT
