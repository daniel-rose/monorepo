const OPTION_TERMINATOR = '--'

// Entries starting with `-` match any argument before a literal `--`; all
// other entries match only the first argument (spec §3).
const isPassthrough = (
  args: readonly string[],
  passthrough: readonly string[]
): boolean => {
  const terminator = args.indexOf(OPTION_TERMINATOR)
  const options = terminator === -1 ? args : args.slice(0, terminator)

  return passthrough.some(entry =>
    entry.startsWith('-') ? options.includes(entry) : args[0] === entry
  )
}

export default isPassthrough
