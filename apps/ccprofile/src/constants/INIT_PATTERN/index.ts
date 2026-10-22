const INIT_PATTERN = {
  // Wizard entries that are directories: `~`, absolute POSIX/UNC paths, drive
  // letters. Everything else is a git remote.
  pathEntry: /^(?:~(?:[/\\]|$)|[/\\]|[A-Za-z]:[/\\])/,
  separator: /\s*,\s*/,
} as const

export default INIT_PATTERN
