import type { ResolvedProfile } from '../../config/types'
import {
  POSITIVE_INTEGER_PATTERN,
  PROFILE_PROMPT_HEADER,
} from '../../constants'
import type { Context } from '../../context/types'
import createLineReader from '../createLineReader'

// Returns the chosen profile, or null for an empty line, EOF or Ctrl-C.
const selectProfile = async (
  profiles: readonly ResolvedProfile[],
  ctx: Context
): Promise<ResolvedProfile | null> => {
  const list = profiles
    .map((profile, index) => `  [${index + 1}] ${profile.name}\n`)
    .join('')
  ctx.stderr.write(`${PROFILE_PROMPT_HEADER}\n${list}`)

  const question = `Select profile [1-${profiles.length}]: `
  const reader = createLineReader(ctx)

  try {
    for (;;) {
      const line = await reader.readLine(question)
      const answer = line?.trim()
      if (!answer) {
        return null
      }
      if (POSITIVE_INTEGER_PATTERN.test(answer)) {
        const profile = profiles[Number(answer) - 1]
        if (profile) {
          return profile
        }
      }
    }
  } finally {
    reader.close()
  }
}

export default selectProfile
