// The lines that fence ccprofile's block in a shell startup file.
const MARKER = {
  start: '# >>> ccprofile >>>',
  end: '# <<< ccprofile <<<',
} as const

export default MARKER
