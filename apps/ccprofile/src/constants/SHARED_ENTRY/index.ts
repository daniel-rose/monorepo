import ENTRY_KIND from '../ENTRY_KIND'

// Entries of an account dir that are links to the shared source of the
// profile (spec §3.3). Everything else stays per account: `.claude.json`
// (login, user-scope MCP), credentials, caches.
const SHARED_ENTRY = [
  { name: 'settings.json', kind: ENTRY_KIND.file },
  { name: 'CLAUDE.md', kind: ENTRY_KIND.file },
  { name: 'keybindings.json', kind: ENTRY_KIND.file },
  { name: 'rules', kind: ENTRY_KIND.directory },
  { name: 'skills', kind: ENTRY_KIND.directory },
  { name: 'agents', kind: ENTRY_KIND.directory },
  { name: 'commands', kind: ENTRY_KIND.directory },
  { name: 'output-styles', kind: ENTRY_KIND.directory },
  { name: 'workflows', kind: ENTRY_KIND.directory },
  { name: 'plugins', kind: ENTRY_KIND.directory },
  { name: 'themes', kind: ENTRY_KIND.directory },
  // History: makes --resume work across the accounts of a profile.
  { name: 'projects', kind: ENTRY_KIND.directory },
] as const

export default SHARED_ENTRY
