import ENTRY_KIND from '../ENTRY_KIND'

// Entries of a Codex home that are links to the Codex home of the profile
// (spec §4.2, P9/P18). Codex profile files `<name>.config.toml` are found in
// the source at link time. Everything else stays per home: `auth.json`, MCP
// OAuth tokens, sqlite state, `sessions/`, `history.jsonl`, caches.
const CODEX_SHARED_ENTRY = [
  { name: 'config.toml', kind: ENTRY_KIND.file },
  { name: 'AGENTS.md', kind: ENTRY_KIND.file },
  { name: 'AGENTS.override.md', kind: ENTRY_KIND.file },
  { name: 'hooks.json', kind: ENTRY_KIND.file },
  { name: 'rules', kind: ENTRY_KIND.directory },
  { name: 'skills', kind: ENTRY_KIND.directory },
  { name: 'plugins', kind: ENTRY_KIND.directory },
  { name: 'themes', kind: ENTRY_KIND.directory },
] as const

export default CODEX_SHARED_ENTRY
