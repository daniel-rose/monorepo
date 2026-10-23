const CONFIG_PATTERN = {
  // Profile names.
  name: /^[A-Za-z0-9_.-]+$/,
  // At least one non-whitespace character.
  nonBlank: /\S/,
  // No TAB, CR or LF (a configDir ends up in shell hook output).
  noLineControl: /^[^\t\r\n]*$/,
} as const

export default CONFIG_PATTERN
