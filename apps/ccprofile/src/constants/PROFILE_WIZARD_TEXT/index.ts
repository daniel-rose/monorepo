// Texts of the profile steps `init` and `add` share. Prompts carry no
// trailing space, messages no newline.
const PROFILE_WIZARD_TEXT = {
  codexPrompt: (name: string) => `Codex CLI for ${name}`,
  codexDisabled: 'no codex',
  codexDisabledHint: 'codex stops in this profile (codex: false)',
  codexHome: 'own Codex home',
  codexHomeHint: 'a Codex login of its own',
  codexDefault: '~/.codex (default)',
  codexDefaultHint: 'shares the Codex login of ~/.codex',
  codexHomePrompt: (name: string) => `Codex home for ${name}`,
  badDir: (value: string) =>
    `"${value}" is not an absolute path (use ~/… or a full path)`,
  lineControl: (value: string) =>
    `"${value}" must not contain TAB or line breaks`,
  dirTaken: (value: string) =>
    `"${value}" is already used (by the config, ~/.claude or ~/.codex)`,
} as const

export default PROFILE_WIZARD_TEXT
