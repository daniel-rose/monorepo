import { CONFIG_PATTERN, INIT_TEXT, ON_UNKNOWN_PROMPT } from '../../constants'

// true for a valid, unused name, else the message for the prompt.
const validateName = (name: string, taken: readonly string[]): true | string =>
  CONFIG_PATTERN.name.test(name) &&
  name !== ON_UNKNOWN_PROMPT &&
  !taken.includes(name)
    ? true
    : INIT_TEXT.badName(name)

export default validateName
