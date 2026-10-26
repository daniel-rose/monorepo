// Raw terminal input of the keys the prompt tests type.
const KEY = {
  enter: '\r',
  down: '\u001b[B',
  space: ' ',
  backspace: '\u007f',
  ctrlC: '\u0003',
  ctrlD: '\u0004',
} as const

export default KEY
