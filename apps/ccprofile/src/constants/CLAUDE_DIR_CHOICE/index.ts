// What `add` offers as the Claude config directory: one that exists and is
// not configured yet (~/.claude included), or a new one.
const CLAUDE_DIR_CHOICE = {
  existing: 'existing',
  new: 'new',
} as const

export default CLAUDE_DIR_CHOICE
