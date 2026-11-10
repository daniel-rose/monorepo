import { z } from 'zod'

import { CONFIG_PATTERN, CONFIG_REASON } from '../../../constants'

// A described string that is not empty or whitespace-only.
const text = (description: string) =>
  z
    .string()
    .regex(CONFIG_PATTERN.nonBlank, CONFIG_REASON.empty)
    .describe(description)

export default text
