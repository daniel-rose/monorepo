// Hooks live in `<package root>/hooks/ccprofile.<extension>`; `setup` copies
// them to `<config home>/ccprofile/hook.<extension>`.
const HOOK_FILE = {
  dirName: 'hooks',
  baseName: 'ccprofile',
  installedBaseName: 'hook',
} as const

export default HOOK_FILE
