import { INIT_PATTERN } from '../../constants'

// The comma-separated entries of a matcher answer, empty ones dropped.
const splitMatchers = (answer: string): string[] =>
  answer
    .split(INIT_PATTERN.separator)
    .map(entry => entry.trim())
    .filter(entry => entry !== '')

export default splitMatchers
